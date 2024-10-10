npm install express 
sql
npm install bcrypt


// /*
// Develop a backend application that handles basic banking operations:
// User login functionality.
// GET Balance API to retrieve the current balance of a user.
// Withdrawal API to deduct money from the account.
// Money Transfer API to enable fund transfers between users.
// Implement logs to track activities and maintain transaction history.
// */
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bodyParser=require("body-parser");
const bcrypt = require('bcrypt');

// Create a connection to the database
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "malikshahid",
  database: "bank",
  insecureAuth: true,
});
