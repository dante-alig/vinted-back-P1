const express = require("express");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");
const mongoose = require("mongoose");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/vintedlog");

cloudinary.config({
  cloud_name: "dchhagcqd",
  api_key: "714416759164992",
  api_secret: "2zK2jbsAIS8--rSqU7KGw0bH3z0",
});

const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

const User = mongoose.model("User", {
  name: String,
  email: String,
  avatar: Object,
  newsletter: Boolean,
  token: String,
  hash: String,
  salt: String,
});

app.get("/", (req, res) => {
  try {
    return res.status(200).json("Bienvenue sur notre serveur Vinted !");
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/token", async (req, res) => {
  try {
    const findToken = await User.findOne({ token: req.body.token });
    if (findToken) {
      return res.status(200).json(true);
    } else {
      return res.status(200).json(false);
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    // avant tout, on vérifie que l'on recoit bien tous les champs requis :

    if (req.body.name && req.body.email && req.body.password) {
      const { name, email, newsletterResult, password } = req.body;

      const bool = () => {
        if (newsletterResult === "true") {
          return true;
        } else {
          return false;
        }
      };

      newsletter = bool();

      // ensuite, on vérifie que l'email est pas déjà pris par un autre user dans la BDD :
      const existingUser = await User.findOne({ email: email });

      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà pris 😱" });
      } else {
        // on va générer un  salt, et un token
        const salt = uid2(16);
        // console.log(salt); // ok
        const token = uid2(32);
        // console.log(token); // ok
        // on va générer un hash
        const saltedPassword = password + salt;
        const hash = SHA256(saltedPassword).toString(encBase64);
        // console.log(hash); // ok
        // on va créer un nouveau user
        const newUser = new User({
          name,
          email,
          newsletter,
          token,
          hash,
          salt,
        });

        if (req.files) {
          const convertedAvatar = convertToBase64(req.files.avatar);
          // console.log(convertedPicture); // affiche une belle base64
          // UPLOAD de l'image sur CLOUDINARY :
          const uploadResult = await cloudinary.uploader.upload(
            convertedAvatar
          );

          newUser.avatar = uploadResult;
        }
        // l'enregistrer en BDD
        console.log(newUser);
        await newUser.save();
        const responseObject = {
          _id: newUser._id,
          account: {
            name: newUser.name,
          },
          token: newUser.token,
        };

        return res.status(201).json(newUser.token);
      }
    } else {
      return res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/user/login", async (req, res) => {
  try {
    // console.log(req.body); // { email: 'johndoe@lereacteur.io', password: 'azerty' }
    const { email, password } = req.body;
    // aller chercher en utilisant l'email si l'utilisateur existe en BDD
    const userFound = await User.findOne({ email: email });
    if (!userFound) {
      return res.status(401).json("Mot de passe ou email incorrect");
    } else {
      // console.log(userFound);
      //   {
      //     name: jhon
      //     email: 'johndoe@lereacteur.io',
      //     newsletter: true,
      //     token: 'SB97C5iTNMSKWa-NFEy487tdUUmzGFnT',
      //     hash: 'XzLEASW7iOJmhUEqkRJrdctEro+2ndicIPPJXJOzUSA=',
      //     salt: 'DPnXj6zTnICgyh6v',
      //     __v: 0
      //   }
      // on va générer un nouveau hash, en ajoutant le salt de l'utilisateur trouvé en BDD, au password envoyé
      const newSaltedPassword = password + userFound.salt;
      const newHash = SHA256(newSaltedPassword).toString(encBase64);
      // on va ensuite comparé ce nouveau hash à celui qui est stocké dans la base de données
      if (newHash !== userFound.hash) {
        // si les nouveau hash est différent de celui en BDD on répond "unauthorized"
        return res.status(401).json("Mot de passe ou email incorrect");
      } else {
        // sinon, c'est ok, on génère un objet de réponse
        const responseObject = {
          _id: userFound._id,
          account: userFound.account,
          token: userFound.token,
        };
        return res.status(200).json(responseObject);
      }
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.all("*", (req, res) => {
  return res.status(404).json("Vous vous êtes perdu 👀");
});

app.listen(3000, () => {
  console.log("Server started 🔥🔥🔥🔥");
});
