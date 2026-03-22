from pymongo import MongoClient
import os

MONGO_URI = os.getenv("MONGO_URI")  # from .env

client = MongoClient(MONGO_URI)
db = client["translator_db"]

users_collection = db["users"]