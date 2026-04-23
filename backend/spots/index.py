import json
import os
import secrets
import psycopg2

SCHEMA = os.environ["MAIN_DB_SCHEMA"]
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_user(cur, token: str):
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.nickname, u.is_admin
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id
            WHERE s.token = %s AND s.expires_at > now()""",
        (token,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    """Spots: list approved spots, create new (pending), approve (admin), checkin by QR.
    Действие передаётся в поле action тела (POST) или query-параметре (GET).
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = json.loads(event.get("body") or "{}")
    token = event.get("headers", {}).get("X-Auth-Token", "")
    params = event.get("queryStringParameters") or {}
    action = body.get("action") or params.get("action", "list")

    conn = get_conn()
    cur = conn.cursor()

    # GET action=list — list approved spots with records
    if method == "GET" and action == "list":
        cur.execute(f"""
            SELECT s.id, s.name, s.address, s.lat, s.lng, s.qr_code,
                   COALESCE(MAX(r.max_reps), 0) as spot_record,
                   COUNT(DISTINCT r.user_id) as athletes_count
            FROM {SCHEMA}.spots s
            LEFT JOIN {SCHEMA}.records r ON r.spot_id = s.id
            WHERE s.status = 'approved'
            GROUP BY s.id
            ORDER BY s.id
        """)
        rows = cur.fetchall()
        spots = [{"id": r[0], "name": r[1], "address": r[2], "lat": r[3], "lng": r[4],
                  "qr_code": r[5], "spot_record": r[6], "athletes_count": r[7]} for r in rows]
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(spots)}

    # GET action=checkin&qr=... — get spot by QR code
    if method == "GET" and action == "checkin":
        qr = params.get("qr", "")
        if not qr:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "QR не указан"})}
        cur.execute(
            f"SELECT id, name, address FROM {SCHEMA}.spots WHERE qr_code = %s AND status = 'approved'",
            (qr,)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Спот не найден"})}
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"id": row[0], "name": row[1], "address": row[2]})}

    # GET action=my-record&spot_id=...&user_id=...
    if method == "GET" and action == "my-record":
        spot_id = params.get("spot_id", "")
        user_id = params.get("user_id", "")
        if not spot_id or not user_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Параметры обязательны"})}
        cur.execute(
            f"SELECT COALESCE(MAX(max_reps),0) FROM {SCHEMA}.records WHERE spot_id = %s AND user_id = %s",
            (spot_id, user_id)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"my_record": row[0]})}

    # POST action=create — create new spot (requires auth)
    if method == "POST" and action == "create":
        user = get_user(cur, token)
        if not user:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Требуется авторизация"})}
        name = (body.get("name") or "").strip()
        address = (body.get("address") or "").strip()
        lat = body.get("lat")
        lng = body.get("lng")
        if not name or lat is None or lng is None:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Название и координаты обязательны"})}

        qr_code = secrets.token_hex(16)
        cur.execute(
            f"INSERT INTO {SCHEMA}.spots (name, address, lat, lng, created_by, status, qr_code) VALUES (%s, %s, %s, %s, %s, 'pending', %s) RETURNING id",
            (name, address, lat, lng, user[0], qr_code)
        )
        spot_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": spot_id, "status": "pending"})}

    # POST action=approve — approve spot (admin only)
    if method == "POST" and action == "approve":
        user = get_user(cur, token)
        if not user or not user[2]:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        spot_id = body.get("spot_id")
        cur.execute(
            f"UPDATE {SCHEMA}.spots SET status = 'approved', approved_by = %s, approved_at = now() WHERE id = %s",
            (user[0], spot_id)
        )
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # GET action=pending — pending spots (admin only)
    if method == "GET" and action == "pending":
        user = get_user(cur, token)
        if not user or not user[2]:
            cur.close(); conn.close()
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Нет доступа"})}
        cur.execute(
            f"SELECT s.id, s.name, s.address, s.lat, s.lng, u.nickname FROM {SCHEMA}.spots s JOIN {SCHEMA}.users u ON u.id = s.created_by WHERE s.status = 'pending' ORDER BY s.created_at"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps([
            {"id": r[0], "name": r[1], "address": r[2], "lat": r[3], "lng": r[4], "created_by": r[5]} for r in rows
        ])}

    cur.close(); conn.close()
    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}