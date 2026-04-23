import json
import os
import hashlib
import secrets
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import psycopg2

SCHEMA = os.environ["MAIN_DB_SCHEMA"]
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def send_verify_email(email: str, nickname: str, token: str):
    host = os.environ.get("SMTP_HOST", "")
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    if not host:
        return
    app_url = "https://p4680007.poehali.dev"
    link = f"{app_url}?verify={token}"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Подтверди email — PullUp App"
    msg["From"] = user
    msg["To"] = email
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#080808;color:#fff;padding:32px;border-radius:16px">
      <h2 style="color:#FFD700;font-size:24px;margin-bottom:8px">Привет, {nickname}!</h2>
      <p style="color:#aaa;margin-bottom:24px">Нажми кнопку чтобы подтвердить email и войти в приложение.</p>
      <a href="{link}" style="display:inline-block;background:#FFD700;color:#000;font-weight:bold;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px">Подтвердить email</a>
      <p style="color:#555;font-size:12px;margin-top:24px">Ссылка действует 24 часа. Если ты не регистрировался — просто игнорируй.</p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP_SSL(host, 465) as s:
        s.login(user, password)
        s.sendmail(user, email, msg.as_string())


def handler(event: dict, context) -> dict:
    """Auth: register, login, verify email, get current user.
    Действие передаётся в поле action тела (POST) или query-параметре (GET).
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = json.loads(event.get("body") or "{}")
    token = event.get("headers", {}).get("X-Auth-Token", "")
    params = event.get("queryStringParameters") or {}
    action = body.get("action") or params.get("action", "")

    # POST action=register
    if method == "POST" and action == "register":
        email = (body.get("email") or "").strip().lower()
        nickname = (body.get("nickname") or "").strip()
        password = body.get("password") or ""

        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректный email"})}
        if len(nickname) < 2 or len(nickname) > 30:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Ник: 2–30 символов"})}
        if len(password) < 6:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Пароль: минимум 6 символов"})}

        verify_token = secrets.token_hex(32)
        expires = datetime.utcnow() + timedelta(hours=24)

        conn = get_conn()
        cur = conn.cursor()
        try:
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (email, nickname, password_hash, verify_token, verify_token_expires_at) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (email, nickname, hash_password(password), verify_token, expires)
            )
            conn.commit()
            send_verify_email(email, nickname, verify_token)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "message": "Письмо отправлено на " + email})}
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Email или ник уже заняты"})}
        finally:
            cur.close()
            conn.close()

    # action=verify
    if action == "verify":
        vtoken = body.get("token") or params.get("token", "")
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, verify_token_expires_at FROM {SCHEMA}.users WHERE verify_token = %s AND email_verified = false",
            (vtoken,)
        )
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Токен недействителен"})}
        if row[1] < datetime.utcnow():
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Токен истёк"})}
        cur.execute(
            f"UPDATE {SCHEMA}.users SET email_verified = true, verify_token = NULL WHERE id = %s",
            (row[0],)
        )
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # POST action=login
    if method == "POST" and action == "login":
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, nickname, email_verified, rank_level, streak_days, is_admin FROM {SCHEMA}.users WHERE email = %s AND password_hash = %s",
            (email, hash_password(password))
        )
        user = cur.fetchone()
        if not user:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Неверный email или пароль"})}
        if not user[2]:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Подтверди email"})}

        sess_token = secrets.token_hex(32)
        expires = datetime.utcnow() + timedelta(days=30)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user[0], sess_token, expires)
        )
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "ok": True, "token": sess_token,
            "user": {"id": user[0], "nickname": user[1], "rank_level": user[3], "streak_days": user[4], "is_admin": user[5]}
        })}

    # GET action=me
    if method == "GET" and action == "me":
        if not token:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Не авторизован"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT u.id, u.nickname, u.email, u.rank_level, u.streak_days, u.is_admin
                FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > now()""",
            (token,)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Сессия истекла"})}
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "id": row[0], "nickname": row[1], "email": row[2],
            "rank_level": row[3], "streak_days": row[4], "is_admin": row[5]
        })}

    # POST action=logout
    if method == "POST" and action == "logout":
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.sessions WHERE token = %s", (token,))
            conn.commit()
            cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}