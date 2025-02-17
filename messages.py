import os
import json


def save_message(chat_id: str, message_data: dict) -> None:
    filename = os.path.join('static/messages/', f"{chat_id}.json")
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            messages = json.load(f)
    else:
        messages = []
    
    messages.append(message_data)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=4)


def load_messages(chat_id: str) -> list:
    filepath = os.path.join('static/messages/', f"{chat_id}.json")
    if not os.path.exists(filepath):
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)
