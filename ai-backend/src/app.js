require('dotenv').config();  
const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/ai.routes');  

const app = express();  


app.use(cors({
    origin: "http://localhost:5173", 
    credentials: true
}));

app.use(express.json());  


app.use('/ai', aiRoutes);

if(process.env.NODE_ENV==="production"){
    app.use(express.static(path.join(__dirname,"../ai-frontend/dist")));

    app.get("*", (req,res) => {
        res.sendFile(path.join(__dirname,"../ai-frontend","dist","index.html"));
    });
}


const PORT = process.env.PORT || 3000;  
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
