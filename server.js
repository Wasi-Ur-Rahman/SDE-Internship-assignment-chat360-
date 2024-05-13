const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const { createFile, createFolder } = require("./utils");
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup ejs
app.set("view engine", "ejs");

// pass json data
app.use(express.json());

// pass form data
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));

// api goes here
app.post('/log/:source', (req, res) => {
    const { level, log_string } = req.body;
    const source = req.params.source;
    const timestamp = new Date().toISOString();
    // Log to file
    const logData = {
        level,
        log_string,
        timestamp,
        metadata: {
            source: `${source}.log`
        }
    };
    const logFilePath = `logs/${source}.log`;

    if (!fs.existsSync(logFilePath)) {
        createFile(logFilePath);
    }
    fs.appendFile(logFilePath, JSON.stringify(logData) + '\n', err => {
        if (err) {
            console.error(err);
        } else {
            console.log('Log written successfully');
        }
    });

    res.sendStatus(200);
});

// search functionality (includes bonus functionality)
app.get('/search', (req, res) => {
    const { level, log_string, start, end, source } = req.query;

    const logFolderPath = path.join(__dirname, 'logs');

    try {
        // Read log files
        const logFiles = fs.readdirSync(logFolderPath)
            .filter(file => file.endsWith('.log'));

        const logs = [];

        logFiles.forEach(file => {
            const logFilePath = path.join(logFolderPath, file);
            const logData = fs.readFileSync(logFilePath, 'utf8').split('\n');

            logData.forEach(line => {
                if (line.trim() !== '') {
                    const log = JSON.parse(line);
                    const logTimestamp = new Date(log.timestamp).getTime(); // Convert timestamp to milliseconds

                    // Use regular expressions for searching log string
                    const regex = new RegExp(log_string, 'i'); // Case-insensitive search
                    const isLogStringMatched = !log_string || regex.test(log.log_string);

                    if ((!level || log.level === level) &&
                        isLogStringMatched &&
                        (!start || new Date(start).getTime() <= logTimestamp) && // Check if log timestamp is after start timestamp
                        (!end || new Date(end).getTime() >= logTimestamp) &&     // Check if log timestamp is before end timestamp
                        (!source || (log.metadata && log.metadata.source.slice(0, -4) === source))) {
                        logs.push(log);
                    }
                }
            });
        });

        res.json(logs);
    } catch (err) {
        console.error("Error reading log files:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// listen server
app.listen(port, () => {
    console.log(`Server started at ${port}`);
});
