from environs import Env


env = Env()
env.read_env()


class Configuration:
    DATA_DIR = env.str("ENVIRONMENT", default="static/data/")
    FILES_DIR = env.str("ENVIRONMENT", default="static/data/uploads/")
    MESSAGES_DIR = env.str("ENVIRONMENT", default="static/data/messages/")
    CONTACTS_FILE = env.str("ENVIRONMENT", default="static/data/contacts.json")
    PASSWORDS_FILE = env.str("ENVIRONMENT", default="static/data/keys.txt")
    

conf = Configuration()
