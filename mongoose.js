var mongoose = require('mongoose');

mongoose.connect("mongodb+srv://Vasu:Vasu@cluster0.6vuhk.mongodb.net/safe_haven?retryWrites=true&w=majority");

collectionSchema = mongoose.Schema({
        name:String,
        email:String,
        location:String,
        type:String,
        password:String,
        latitude : String,
        longitude : String,
        experience : String,
        available : String,
        rating : String,
        resources: {
                
            type : Object,
            default : {}
        }
});

collectionModel = mongoose.model('rescue_agencies',collectionSchema);

module.exports = collectionModel;