var express = require("express");
var cors = require("cors");
var bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
var app = express();
app.use(bodyParser.json());
app.use(cors());
// Setting for Hyperledger Fabric
const { Gateway, Wallets } = require("fabric-network");
const path = require("path");
const fs = require("fs");
//const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
//      const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

app.post("/api/registerUser/", async function (req, res) {
    try {
        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser" does not exist in the wallet'
            );
            console.log("Run the registerUser .js application before retrying");
            return;
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("fabcar");

        const {
            id,
            name,
            email,
            stakeholder,
            phone,
            dateOfBirth,
            sex,
            specialization,
            password,
        } = req.body.params;

        const result = await contract.evaluateTransaction("queryAllData");
        let aaryData = JSON.parse(result);

        console.log("req.body.params", req.body.params);
        console.log("aaryData", aaryData);

        const responseData = aaryData.filter(
            (data) => data.Record.email === email
        );
        console.log(responseData.length);

        if (responseData.length <= 0) {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);
             const userInfo = {
                id,
                name,
                email,
                stakeholder,
                phone,
                dateOfBirth,
                sex,
                specialization,
                password: hashedPassword, // You may choose to omit this
                docType: "User ",
            };

                      await contract.submitTransaction(
                "createUserObj",
                id,
                name,
                email,
                hashedPassword,
                stakeholder,
                dateOfBirth,
                sex,
                phone,
                specialization
            );

            // Create a response object with a specific order
            const userResponse = {
                id: userInfo.id,
                name: userInfo.name,
                email: userInfo.email,
                stakeholder: userInfo.stakeholder,
                phone: userInfo.phone,
                dateOfBirth: userInfo.dateOfBirth,
                sex: userInfo.sex,
                specialization: userInfo.specialization,
                // Do not include the password in the response
            };

           
            res.status(200).json({
                message: "Transaction has been submitted",
                response: userResponse,
            });
        } else {
            res.status(400).send("User already exists");
        }

        // Disconnect from the gateway.
        await gateway.disconnect();
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while processing your request");
    }
});

app.post("/api/login", async function (req, res) {
    try {
        var email = req.body.params.email;
        var password = req.body.params.password;
        console.log(req.body.params);

        if (!email || !password) {
            console.log("Please enter your details!");
            return res
                .status(200)
                .json({ error: "Please enter your details!" });
        }

        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
      

        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser " does not exist in the wallet'
            );
            console.log("Run the registerUser .js application before retrying");
            return res
                .status(404)
                .json({ error: "User  identity not found in wallet" });
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });

        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("fabcar");

        const result = await contract.evaluateTransaction("queryAllData");
        let aaryData = JSON.parse(result.toString());

        // Find the user by email
        var responseData = aaryData.filter(
            (data) => data.Record.email == email
        );
        console.log(responseData);

        if (responseData.length > 0) {
            const user = responseData[0].Record;

            // Compare the provided password with the hashed password
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                delete user.password; // Remove the password from the response
                delete user.docType; // Remove docType if necessary

                user.statusMessage = "Success Login";
                console.log("success");
                return res.status(200).json({ response: user });
            } else {
                console.log("Credentials not verified!");
                return res
                    .status(200)
                    .json({ error: "Credentials not verified!" });
            }
        } else {
            console.log("User  not found!");
            return res.status(200).json({ error: "User  not found!" });
        }
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        return res.status(500).json({ error: error.message });
    }
});

// app.post("/api/createEMR", async function (req, res) {
//     try {
//         const ccpPath = path.resolve(
//             __dirname,
//             "..",
//             "..",
//             "test-network",
//             "organizations",
//             "peerOrganizations",
//             "org1.example.com",
//             "connection-org1.json"
//         );
//         const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
//         const walletPath = path.join(process.cwd(), "wallet");
//         const wallet = await Wallets.newFileSystemWallet(walletPath);
//         console.log(`Wallet path: ${walletPath}`);

//         const identity = await wallet.get("appUser");
//         if (!identity) {
//             console.log(
//                 'An identity for the user "appUser " does not exist in the wallet'
//             );
//             console.log("Run the registerUser .js application before retrying");
//             return;
//         }

//         const gateway = new Gateway();
//         await gateway.connect(ccp, {
//             wallet,
//             identity: "appUser",
//             discovery: { enabled: true, asLocalhost: true },
//         });

//         const network = await gateway.getNetwork("mychannel");
//         const contract = network.getContract("fabcar");

//         console.log(req.body);
//         const {
//             id,
//             patientInformation,
//             medicalHistory,
//             vitalSigns,
//             chiefComplaint,
//             physicalExamination,
//             diagnosticTests,
//             assessmentAndPlan,
//             progressNotes
//         } = req.body.params;

//         await contract.submitTransaction("createEMR", id,
//             patientInformation,
//             medicalHistory,
//             vitalSigns,
//             chiefComplaint,
//             physicalExamination,
//             diagnosticTests,
//             assessmentAndPlan,
//             progressNotes,

//         );

//         res.status(200).send("Transaction has been submitted");

//         await gateway.disconnect();
//     } catch (error) {
//         console.error(`Failed to submit transaction: ${error}`);
//         res.status(500).send(`Failed to submit transaction: ${error.message}`);
//     }
// });

// app.get('/api/getemr/:id', async function (req, res) {
//     try {
//         const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
//         const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

//         // Create a new file system based wallet for managing identities.
//         const walletPath = path.join(process.cwd(), 'wallet');
//         const wallet = await Wallets.newFileSystemWallet(walletPath);
//         console.log(`Wallet path: ${walletPath}`);

//         // Check to see if we've already enrolled the user.
//         const identity = await wallet.get('appUser ');
//         if (!identity) {
//             console.log('An identity for the user "appUser " does not exist in the wallet');
//             console.log('Run the registerUser .js application before retrying');
//             return res.status(401).send('Unauthorized');
//         }

//         // Create a new gateway for connecting to our peer node.
//         const gateway = new Gateway();
//         await gateway.connect(ccp, { wallet, identity: 'appUser ', discovery: { enabled: true, asLocalhost: true } });

//         // Get the network (channel) our contract is deployed to.
//         const network = await gateway.getNetwork('mychannel');

//         // Get the contract from the network.
//         const contract = network.getContract('fabcar');

//         // Retrieve the EMR data using the provided ID
//         const emrId = req.params.id; // Get the ID from the request parameters
//         const result = await contract.evaluateTransaction('queryEMR', emrId); // Assuming 'queryEMR' is the function to get EMR by ID

//         console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
//         res.status(200).json({ response: JSON.parse(result.toString()) }); // Parse and return the result
//     } catch (error) {
//         console.error(`Failed to evaluate transaction: ${error}`);
//         res.status(500).json({ error: error.message });
//     }
// });

app.post("/api/createEMR", async function (req, res) {
    try {
        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser " does not exist in the wallet'
            );
            console.log(
                "Run the registerUser  .js application before retrying"
            );
            return;
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });

        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("fabcar");

        console.log(req.body);
        const {
            id,
            patientInformation,
            medicalHistory,
            vitalSigns,
            chiefComplaint,
            physicalExamination,
            diagnosticTests,
            assessmentAndPlan,
            progressNotes,
            doctor,
        } = req.body.params;

        // Create the EMR object

        // Store the EMR object in the ledger
        await contract.submitTransaction(
            "createEMR",
            id,
            JSON.stringify(patientInformation),
            JSON.stringify(medicalHistory),
            JSON.stringify(vitalSigns),
            JSON.stringify(chiefComplaint),
            JSON.stringify(physicalExamination),
            JSON.stringify(diagnosticTests),
            JSON.stringify(assessmentAndPlan),
            JSON.stringify(progressNotes),
            JSON.stringify(doctor)
        );

        res.status(200).send("Transaction has been submitted");

        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).send(`Failed to submit transaction: ${error.message}`);
    }
});

app.get("/api/getallemr", async function (req, res) {
    try {
        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser" does not exist in the wallet'
            );
            console.log("Run the registerUser .js application before retrying");
            return res.status(401).send("Unauthorized");
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork("mychannel");

        // Get the contract from the network.
        const contract = network.getContract("fabcar");

        // Retrieve all EMR data
        const result = await contract.evaluateTransaction("queryEmrData"); // Assuming 'queryAllData' retrieves all records
        const allData = JSON.parse(result.toString());
        // console.log(allData[0].Record.docType);
        // Filter the data for docType = "EMR"
        const emrData = allData.filter(
            (record) => record.Record.docType === "EMR"
        );

        res.status(200).json({ response: emrData }); // Return the filtered EMR records
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/getusers", async function (req, res) {
    try {
        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
        // Create a new file system based wallet for managing identities.
        console.log(ccp);
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser" does not exist in the wallet'
            );
            console.log("Run the registerUser.js application before retrying");
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork("mychannel");

        // Get the contract from the network.
        const contract = network.getContract("fabcar");

        // Evaluate the specified transaction.
        // queryCar transaction - requires 1 argument, ex: ('queryCar', 'CAR4')
        // queryAllCars transaction - requires no arguments, ex: ('queryAllCars')
        const result = await contract.evaluateTransaction("queryAllCars");
        console.log(JSON.parse(result));

        console.log(
            `Transaction has been evaluated, result is: ${result.toString()}`
        );
        res.status(200).json({ response: result.toString() });
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        res.status(500).json({ error: error });
        process.exit(1);
    }
});

app.get("/api/query/:car_index", async function (req, res) {
    try {
        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser" does not exist in the wallet'
            );
            console.log("Run the registerUser.js application before retrying");
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork("mychannel");

        // Get the contract from the network.
        const contract = network.getContract("fabcar");
        // Evaluate the specified transaction.
        // queryCar transaction - requires 1 argument, ex: ('queryCar', 'CAR4')
        // queryAllCars transaction - requires no arguments, ex: ('queryAllCars')
        const result = await contract.evaluateTransaction(
            "queryCar",
            req.params.car_index
        );
        console.log(
            `Transaction has been evaluated, result is: ${result.toString()}`
        );
        res.status(200).json({ response: result.toString() });
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        res.status(500).json({ error: error });
        process.exit(1);
    }
});

app.post("/api/addcar/", async function (req, res) {
    try {
        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser" does not exist in the wallet'
            );
            console.log("Run the registerUser.js application before retrying");
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork("mychannel");

        // Get the contract from the network.
        const contract = network.getContract("fabcar");
        // Submit the specified transaction.
        // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
        // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
        await contract.submitTransaction(
            "createCar",
            req.body.carid,
            req.body.make,
            req.body.model,
            req.body.colour,
            req.body.owner
        );
        console.log("Transaction has been submitted");
        res.send("Transaction has been submitted");
        // Disconnect from the gateway.
        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
});

app.put("/api/changeowner/:car_index", async function (req, res) {
    try {
        const ccpPath = path.resolve(
            __dirname,
            "..",
            "..",
            "test-network",
            "organizations",
            "peerOrganizations",
            "org1.example.com",
            "connection-org1.json"
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        // console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get("appUser");
        if (!identity) {
            console.log(
                'An identity for the user "appUser" does not exist in the wallet'
            );
            console.log("Run the registerUser.js application before retrying");
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true },
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork("mychannel");

        // Get the contract from the network.
        const contract = network.getContract("fabcar");
        // Submit the specified transaction.
        // createCar transaction - requires 5 argument, ex: ('createCar', 'CAR12', 'Honda', 'Accord', 'Black', 'Tom')
        // changeCarOwner transaction - requires 2 args , ex: ('changeCarOwner', 'CAR10', 'Dave')
        await contract.submitTransaction(
            "changeCarOwner",
            req.params.car_index,
            req.body.owner
        );
        console.log("Transaction has been submitted");
        res.send("Transaction has been submitted");
        // Disconnect from the gateway.
        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
});

app.listen(5000, () => {
    console.log("server running 5000");
});
