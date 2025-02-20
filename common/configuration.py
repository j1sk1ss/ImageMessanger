from environs import Env


env = Env()
env.read_env()


class Configuration:
    DATA_DIR = env.str("DATA_DIR", default="static/data/")
    FILES_DIR = env.str("FILES_DIR", default="static/data/uploads/")
    MESSAGES_DIR = env.str("MESSAGES_DIR", default="static/data/messages/")
    CONTACTS_FILE = env.str("CONTACTS_FILE", default="static/data/contacts.json")
    PASSWORDS_FILE = env.str("PASSWORDS_FILE", default="static/data/keys.txt")
    

conf = Configuration()
