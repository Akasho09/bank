const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = "jwtpasskey";

// Middlewares
app.use(bodyParser.json());
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
app.use(morgan('combined', {stream: accessLogStream } ));
app.use(morgan("dev"));

// MySQL Connection
// Create a connection to the database
const database = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "your-password",
  database: "bank",
});

// Connect to MySQL
database.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

app.get("/", (req, res) => {
  res.send("Landing Page !!");
});

// User Registration
app.post("/signup", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);

  database.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashedPassword],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "User registered successfully!" });
    }
  );
});

// User Login
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  database.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err || results.length === 0) {
        return res
          .status(401)
          .json({ message: `User does not exist + ${err}` });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Invalid useraname or password" });
      }

      const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1h" });
      res.send("User Logged In Sucessfully \n" + `Bearer\n ${token}`);
    }
  );
});

// Middleware to authenticate JWT
// pass jwt token in headers as Authorization : token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzI4NTg5NDkwLCJleHAiOjE3Mjg1OTMwOTB9.m83SofJfQrK5dQRJjG5E0SpHA5eGf_eC_tVSrYjE_p0
// or bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzI4NTg5NDkwLCJleHAiOjE3Mjg1OTMwOTB9.m83SofJfQrK5dQRJjG5E0SpHA5eGf_eC_tVSrYjE_p0
// use space to seprate not line
const authenticateJWT = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.sendStatus(403);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.sendStatus(403).send("Please send token only without Bearer");
    }
    req.user = user; //
    next();
  });
};

// pass id in the url as a query parameter
// e.g http://localhost:3000/balance?id=1
app.get("/balance", authenticateJWT, (req, res) => {
  database.query(
    "SELECT balance FROM users WHERE id = ?",
    [req.user.id],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ balance: results[0].balance });
    }
  );
});

// Withdrawal API
app.post("/withdraw", authenticateJWT, (req, res) => {
  const { amount } = req.body;

  // Start transaction
  database.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ error: "Transaction failed to start" });
    }

    // Check if user has sufficient funds
    database.query(
      "SELECT balance FROM users WHERE id = ?",
      [req.user.id],
      (err, results) => {
        if (err) {
          return database.rollback(() =>
            res.status(500).json({ error: err.message })
          );
        }

        const userBalance = results[0].balance;
        if (userBalance < amount) {
          return database.rollback(() =>
            res.status(400).json({ message: "Insufficient funds" })
          );
        }

        // Proceed with balance deduction
        database.query(
          "UPDATE users SET balance = balance - ? WHERE id = ?",
          [amount, req.user.id],
          (err) => {
            if (err) {
              return database.rollback(() =>
                res.status(500).json({ error: err.message })
              );
            }

            // Log the transaction
            database.query(
              'INSERT INTO transactions (user_id, type, amount) VALUES (?, "withdrawal", ?)',
              [req.user.id, amount],
              (err) => {
                if (err) {
                  return database.rollback(() =>
                    res.status(500).json({ error: err.message })
                  );
                }

                // Commit transaction
                database.commit((err) => {
                  if (err) {
                    return database.rollback(() =>
                      res
                        .status(500)
                        .json({ error: "Transaction commit failed" })
                    );
                  }

                  res.json({ message: "Withdrawal successful" });
                });
              }
            );
          }
        );
      }
    );
  });
});

// Money Transfer API
app.post("/transfer", authenticateJWT, (req, res) => {
  const { recipientUsername, amount } = req.body;

  database.query(
    "SELECT id, balance FROM users WHERE username = ?",
    [recipientUsername],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      const recipientId = results[0].id;
      const recipientBalance = results[0].balance;

      if (recipientBalance < amount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      database.query(
        "UPDATE users SET balance = balance - ? WHERE id = ?",
        [amount, req.user.id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          database.query(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            [amount, recipientId],
            (err) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              // Log transaction for both users
              database.query(
                'INSERT INTO transactions (user_id, type, amount) VALUES (?, "transfer", ?)',
                [req.user.id, amount]
              );
              database.query(
                'INSERT INTO transactions (user_id, type, amount) VALUES (?, "transfer", ?)',
                [recipientId, amount]
              );

              res.json({ message: "Transfer successful" });
            }
          );
        }
      );
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});