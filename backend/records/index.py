import json
import os
import psycopg2

SCHEMA = os.environ["MAIN_DB_SCHEMA"]
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_user_id(cur, token: str):
    if not token:
        return None
    cur.execute(
        f"SELECT u.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > now()",
        (token,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def update_streak(cur, user_id: int):
    cur.execute(f"SELECT last_workout_date, streak_days FROM {SCHEMA}.users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return
    last_date, streak = row
    from datetime import date, timedelta
    today = date.today()
    if last_date is None:
        new_streak = 1
    elif last_date == today:
        return
    elif last_date == today - timedelta(days=1):
        new_streak = (streak or 0) + 1
    else:
        new_streak = 1
    rank = 1 + new_streak // 10
    cur.execute(
        f"UPDATE {SCHEMA}.users SET last_workout_date = %s, streak_days = %s, rank_level = %s WHERE id = %s",
        (today, new_streak, min(rank, 5), user_id)
    )


def handler(event: dict, context) -> dict:
    """Records: save workout result, get spot leaderboard, global rating.
    Действие передаётся в поле action тела (POST) или query-параметре (GET).
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = json.loads(event.get("body") or "{}")
    params = event.get("queryStringParameters") or {}
    token = event.get("headers", {}).get("X-Auth-Token", "") or params.get("_token", "")
    action = body.get("action") or params.get("action", "")

    conn = get_conn()
    cur = conn.cursor()

    # POST action=save — save workout
    if method == "POST" and action == "save":
        user_id = get_user_id(cur, token)
        if not user_id:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Требуется авторизация"})}

        spot_id = body.get("spot_id")
        max_reps = body.get("max_reps", 0)
        total_reps = body.get("total_reps", 0)
        mode = body.get("mode", "max")
        sets = body.get("sets", [])

        if not spot_id or max_reps <= 0:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Некорректные данные"})}

        # Проверяем что спот существует
        cur.execute(f"SELECT id FROM {SCHEMA}.spots WHERE id = %s", (spot_id,))
        if not cur.fetchone():
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Спот не найден", "code": "spot_not_found"})}

        cur.execute(
            f"INSERT INTO {SCHEMA}.records (user_id, spot_id, max_reps, total_reps, mode, sets) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (user_id, spot_id, max_reps, total_reps, mode, json.dumps(sets))
        )
        record_id = cur.fetchone()[0]

        # Check personal best
        cur.execute(
            f"SELECT COALESCE(MAX(max_reps),0) FROM {SCHEMA}.records WHERE user_id = %s AND spot_id = %s AND id != %s",
            (user_id, spot_id, record_id)
        )
        prev_best = cur.fetchone()[0]
        is_new_record = max_reps > prev_best

        # Update personal_bests
        cur.execute(
            f"""INSERT INTO {SCHEMA}.personal_bests (user_id, spot_id, max_reps, updated_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (user_id, spot_id) DO UPDATE SET max_reps = EXCLUDED.max_reps, updated_at = now()
                WHERE personal_bests.max_reps < EXCLUDED.max_reps""",
            (user_id, spot_id, max_reps)
        )

        update_streak(cur, user_id)
        conn.commit()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "is_new_record": is_new_record})}

    # GET action=leaderboard&spot_id=...
    if method == "GET" and action == "leaderboard":
        spot_id = params.get("spot_id", "")
        if not spot_id:
            cur.close(); conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "spot_id обязателен"})}
        cur.execute(f"""
            SELECT u.id, u.nickname, MAX(r.max_reps) as best, u.streak_days
            FROM {SCHEMA}.records r
            JOIN {SCHEMA}.users u ON u.id = r.user_id
            WHERE r.spot_id = %s
            GROUP BY u.id, u.nickname, u.streak_days
            ORDER BY best DESC
            LIMIT 10
        """, (spot_id,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps([
            {"rank": i+1, "user_id": r[0], "nickname": r[1], "record": r[2], "streak": r[3]}
            for i, r in enumerate(rows)
        ])}

    # GET action=rating — global rating
    if method == "GET" and action == "rating":
        cur.execute(f"""
            SELECT u.id, u.nickname, u.streak_days, u.rank_level,
                   COALESCE(MAX(r.max_reps), 0) as best,
                   COALESCE(SUM(r.total_reps), 0) as total
            FROM {SCHEMA}.users u
            LEFT JOIN {SCHEMA}.records r ON r.user_id = u.id
            WHERE u.email_verified = true
            GROUP BY u.id, u.nickname, u.streak_days, u.rank_level
            ORDER BY best DESC, total DESC
            LIMIT 50
        """)
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps([
            {"rank": i+1, "user_id": r[0], "nickname": r[1], "streak": r[2],
             "rank_level": r[3], "record": r[4], "total": r[5]}
            for i, r in enumerate(rows)
        ])}

    # GET action=my&spot_id=... (user's history on spot)
    if method == "GET" and action == "my":
        user_id = get_user_id(cur, token)
        if not user_id:
            cur.close(); conn.close()
            return {"statusCode": 401, "headers": CORS, "body": json.dumps({"error": "Требуется авторизация"})}
        spot_id = params.get("spot_id", "")
        query = f"SELECT id, spot_id, max_reps, total_reps, mode, recorded_at FROM {SCHEMA}.records WHERE user_id = %s"
        args = [user_id]
        if spot_id:
            query += " AND spot_id = %s"
            args.append(spot_id)
        query += " ORDER BY recorded_at DESC LIMIT 20"
        cur.execute(query, args)
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps([
            {"id": r[0], "spot_id": r[1], "max_reps": r[2], "total_reps": r[3], "mode": r[4],
             "recorded_at": str(r[5])}
            for r in rows
        ])}

    cur.close(); conn.close()
    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}