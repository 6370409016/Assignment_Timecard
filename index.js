const express = require('express');
const multer = require('multer');
const excelToJson = require('convert-excel-to-json');
const fs = require('fs-extra');

const app = express();
const port = 3000;

var upload = multer({ dest: "uploads/" });



// Define analyzeData outside of the app.post callback
function analyzeData(data) {
    // Assuming data is an array of objects
    const sheetName = Object.keys(data)[0]; // Get the sheet name
    const dataArray = data[sheetName]; // Extract the array from the object

    // Function to calculate the difference in hours between two timestamps
    function getHourDifference(start, end) {
        const diffInMilliseconds = new Date(end) - new Date(start);
        return diffInMilliseconds / (1000 * 60 * 60);
    }

    // Sort the data based on the "Time" field
    dataArray.sort((a, b) => new Date(a.Time) - new Date(b.Time));

    // Arrays to store results for each condition
    const lessThan10Hours = [];
    const consecutiveDays = [];
    const moreThan14Hours = [];

    // Iterate over the sorted data to analyze
    for (let i = 0; i < dataArray.length - 1; i++) {
        const currentEntry = dataArray[i];
        const nextEntry = dataArray[i + 1];

        // Calculate the difference in hours between shifts
        const timeDifference = getHourDifference(currentEntry["Time Out"], nextEntry["Time"]);

        // Check the criteria
        if (timeDifference < 10 && timeDifference > 1) {
            lessThan10Hours.push({
                name: currentEntry["Employee Name"],
                positionID: currentEntry["Position ID"]
            });
        }

        // Check for consecutive days
        const currentDate = new Date(currentEntry["Time"]);
        const nextDate = new Date(nextEntry["Time"]);
        const dayDifference = (nextDate - currentDate) / (1000 * 60 * 60 * 24);

        if (dayDifference === 1) {
            consecutiveDays.push({
                name: currentEntry["Employee Name"],
                positionID: currentEntry["Position ID"]
            });
        }

        // Check for more than 14 hours in a single shift
        const shiftHours = getHourDifference(currentEntry["Time"], currentEntry["Time Out"]);
        if (shiftHours > 14) {
            moreThan14Hours.push({
                name: currentEntry["Employee Name"],
                positionID: currentEntry["Position ID"]
            });
        }
    }

    // Print the results in the desired order
    console.log("Results:");
    console.log("a) Employees who have worked for 7 consecutive days:");
    consecutiveDays.forEach(result => console.log(`${result.name} (${result.positionID})`));
    console.log("\nb) Employees who have less than 10 hours between shifts but greater than 1 hour:");
    lessThan10Hours.forEach(result => console.log(`${result.name} (${result.positionID})`));
    console.log("\nc) Employees who have worked for more than 14 hours in a single shift:");
    moreThan14Hours.forEach(result => console.log(`${result.name} (${result.positionID})`));
}



// Usage in your route
app.post('/read', upload.single("file"), (req, res) => {
    try {
        if (req.file?.filename == null || req.file?.filename == "undefined") {
            res.status(400).json({ error: 'No File' });
        } else {
            var filePath = "uploads/" + req.file.filename;

            const excelData = excelToJson({
                sourceFile: filePath,
                header: {
                    rows: 1,
                },
                columnToKey: {
                    "*": "{{columnHeader}}"
                }
            });
            fs.remove(filePath);
            res.status(200).json(excelData);

            // Example usage
            analyzeData(excelData);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(port, () => {
    console.log(`app is running on the port ${port}`);
});