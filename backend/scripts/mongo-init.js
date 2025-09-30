// MongoDB initialization script for Docker
// This script creates the database and a sample admin user

db = db.getSiblingDB('questcoder');

// Create collections
db.createCollection('users');
db.createCollection('patterns');
db.createCollection('userProgress');
db.createCollection('badges');
db.createCollection('userGamification');
db.createCollection('notifications');
db.createCollection('challenges');
db.createCollection('platformStatuses');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.platformStatuses.createIndex({ "platform": 1 }, { unique: true });

print('Database initialized successfully!');





