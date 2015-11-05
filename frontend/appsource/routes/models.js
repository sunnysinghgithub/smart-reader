var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    fname: String,
    lname: String,
    uname: String,
    email: String,
    password: String
});

var importantWordsSchema = mongoose.Schema({
	_searchedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	words: String
});

mongoose.connect('mongodb://mongodb/test');

var User = mongoose.model('User', userSchema);
var ImportantWords = mongoose.model('ImportantWords', importantWordsSchema)

exports.User = User;
exports.ImportantWords = ImportantWords;


