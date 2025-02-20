import os
import json

from common.configuration import conf


def save_message(chat_id: str, message_data: dict) -> None:
    filename = os.path.join(conf.MESSAGES_DIR, f"{chat_id}.json")
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            messages = json.load(f)
    else:
        messages = []
    
    messages.append(message_data)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=4)


def load_messages(chat_id: str, offset: int = 0, limit: int = 20) -> tuple[list, bool]:
    filepath = os.path.join(conf.MESSAGES_DIR, f"{chat_id}.json")
    if not os.path.exists(filepath):
        return [], False

    with open(filepath, "r", encoding="utf-8") as f:
        all_messages = json.load(f)

    return all_messages[int(offset):int(offset) + int(limit)], len(all_messages) > int(offset) + int(limit)
