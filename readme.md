# Prerequisites: 
Node.js and MySQL

# Set Up the MySQL Database
- mysql -u root -p
- CREATE DATABASE bank;
- USE bank;
- CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

- CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  type VARCHAR(50),
  amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

# Steps to Run on Local Machine 
- git clone https://github.com/Akasho09/bank.git
- cd bank
- npm install
- Update Credentials in index.js
  const database = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "your-password",  // Replace with your MySQL password
  database: "bank",
});

- npm start

# Important points 
Send Authorization Header : Bearer <token>

"A space in between only ."


# API Endpoints
URL: GET /

Response: "Landing Page !!"
User Registration:

URL: POST /signup

Body Parameters:
username: Username of the user.
password: Password of the user.
Response: Registers the user and hashes the password.

URL: POST /login

Body Parameters:
username: Username of the user.
password: Password of the user.
Response: Returns a JWT token if the credentials are correct.

URL: GET /balance

Headers:
Authorization: Bearer <JWT token>
Response: Returns the user's balance.

URL: POST /withdraw

Headers:
Authorization: Bearer <JWT token>
Body Parameters:
amount: The amount to withdraw.
Response: Deducts the amount from the user's balance if sufficient funds exist.

URL: POST /transfer

Headers:
Authorization: Bearer <JWT token>
Body Parameters:
recipientUsername: The username of the recipient.
amount: The amount to transfer.
Response: Transfers the amount between users.