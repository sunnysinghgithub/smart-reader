var express = require('express');
var zerorpc = require("zerorpc");
var models = require('./models.js');
var client = new zerorpc.Client();

var router = express.Router();
var viewCount = 1;

/* GET home page. */
router.get('/', function(req, res, next) {
    if(req.session && req.session.user){
        console.log('User is: '+JSON.stringify(req.session.user));
        res.render('home', { title: 'Smart Reader - Home', user: req.session.user});    
    }else{    
       res.render('home', { title: 'Smart Reader - Home', viewCount: viewCount++});
    }
});

/* GET home page. */
router.get('/home', function(req, res, next) {
    if(req.session && req.session.user){
        console.log('User is: '+JSON.stringify(req.session.user));
        res.render('home', { title: 'Smart Reader - Home', user: req.session.user});    
    }else{    
	   res.render('home', { title: 'Smart Reader - Home', viewCount: viewCount++});
    }
});

/* POST API to search for the important words in given text elements. */
router.post('/findgems', function(req, res, next) {
	console.log("received request: "+JSON.stringify(req.body));

	var input = req.body;
	var userSelectionText = '';
	for(i=0;i<input.length;i++){
		userSelectionText += input[i].text;
	}
	
	console.log("userSelectionText: "+userSelectionText);	

	client.connect("tcp://backend:5000");

	client.invoke("hello", userSelectionText, function(error, response, more) {
		if(error) {
        	console.error(error);
            res.end();
    	}else{
    		console.log("response from python backend: "+response);
    		var userSelection = [];
            if(input.length == 1){
                userSelection = input[0].text.split(" ");
            }else{
                for(i=0 ; i<input.length; i++){
                    userSelection[i] = input[i].text;
                }
            }
    		var gems = JSON.parse(response);
		    var index = buildIndex(userSelection);
		    gems = calculateFontSize(gems);
            if(req.session && req.session.user){
                models.User.findOne({ _id: req.session.user._id }, function (err, user){
                    searchRelatedGems(0,gems,req.session.user._id,processGems,res,input,userSelection,index,user);
                });
            }else{
                processGems(gems, res, input, userSelection, index);
            }
    	}
	});
});

function searchRelatedGems(i, gems, user_id, callback, res, input, userSelection, index, user) {
    if(i < gems.length) {
        var gem = gems[i];
        models.ImportantWords.find({_searchedBy:user_id,words:{'$regex':gem.name}}).exec(function(err, importantWords){
            gem.relatedWords = [];
            for(var j=0; j<importantWords.length; j++){
                if(importantWords[j].words){
                    if(gem.relatedWords.length<4){
                        gem.relatedWords = gem.relatedWords.concat(getRelatedWords(importantWords, j, gem));
                    }
                }
            }
            searchRelatedGems(i+1, gems, user_id, callback, res, input, userSelection, index, user);
        });
    }else{
        callback(gems, res, input, userSelection, index, user);
    }        
}

function getRelatedWords(importantWords, j, gem) {
    var relatedWords = [];
    JSON.parse(importantWords[j].words, function(k,v){
        if(typeof(v) == "object"){
            if(v.name && v.name!=gem.name){
                relatedWords.push(v);
            }            
        }
        return v;
    });
    return relatedWords.slice(0,4);
}

function processGems(gems, res, input, userSelection, index, user) {
    if(user){
        var importantWords = new models.ImportantWords;
        importantWords.words = JSON.stringify(gems, function (propertyName, propertyValue) {
                                        if(propertyName == "relatedWords") return undefined;
                                        else return propertyValue;
                                    });        
        importantWords._searchedBy = user;
        importantWords.save();        
    }
    var concatenateOutput = false;
    console.log("input is: "+JSON.stringify(input));
    console.log("input length: "+input.length);
    console.log("user selection is: "+JSON.stringify(userSelection));
    if(input.length == 1){
        concatenateOutput = true;
        for (var i = 0; i < userSelection.length; i++){
            input[i] = {"text":userSelection[i]};
        }
        console.log("input after pushing is: "+JSON.stringify(input));
    }    
    input = markGems(input, userSelection, gems, index);
    if(concatenateOutput){
        for (var i = 1; i < input.length; i++){
            input[0].text = input[0].text +" "+ input[i].text;
        }
        input.splice(1,input.length-1);
    }
    console.log("Response: "+JSON.stringify(input));
    res.write(JSON.stringify(input));
    res.end();
}



// Calculates the Font Size.
function calculateFontSize(gems){ 
    var MAX_FONT_SIZE = 30;
    var MIN_FONT_SIZE = 15;
    var minWeight = gems[gems.length-1].weight;
    var maxWeight = gems[0].weight;
    for(i=0;i<gems.length;i++){
        if(gems[i].weight == minWeight){
            gems[i].fontSize = MIN_FONT_SIZE;
        }else{
            gems[i].fontSize = ((gems[i].weight/maxWeight) * (MAX_FONT_SIZE-MIN_FONT_SIZE))+MIN_FONT_SIZE;
        }
    }
    return gems;
}

// Builds the index
function buildIndex(userSelection) {
    var startIndex = 0;
    var index = [];
    for(i=0; i<userSelection.length; i++){
        endIndex = startIndex + (userSelection[i].length); // 1 for space offset
        index.push({start:startIndex,end:endIndex});
        startIndex = endIndex+1;
    }
    return index;
}

// Marks the Gems in the userSelection
function markGems(input, userSelection, gems, index) {
    var userText = userSelection.join(" ").toLowerCase();

    console.log("User Text is: "+userText);
    
    // Loop over the each gem and mark it in the userSelection
    for(var i=0; i<gems.length; i++){
        console.log("going to mark gem: "+gems[i].name);

        var gemAtIndex = -1;
        var searchArr = gems[i].name.split(' ');
        if(searchArr.length > 1){
            var searchExpr = searchArr.join("\\s*");
            gemAtIndex = userText.search(searchExpr);
        }else{
           gemAtIndex = userText.indexOf(gems[i].name);
        }
                
        // First we find where the gem is located            
        console.log("Found gem at index: "+gemAtIndex);
        
        // Now lookup the index for the entry
        for(var j=0; j<index.length; j++){            
            if (gemAtIndex >= index[j].start && gemAtIndex < index[j].end){
                // We found the entry where we have the gem    
                console.log("Found gem in the index @ entry: "+j);
                
                // Now check if we are overlowing or not
                if ((gemAtIndex + gems[i].name.length) > index[j].end){                    
                    // We are overflowing to next entry
                    console.log("We are overflowing. This user selection is: "+input[j].text);
                    
                    // Mark the part of the gem in the first entry
                   	input[j].text = input[j].text.slice(0,gemAtIndex - index[j].start)+"<div class='gemContainer'><div class='gem' style='font-size:"+gems[i].fontSize+"px' relatedwords='"+JSON.stringify(gems[i].relatedWords)+"'>"+input[j].text.slice(gemAtIndex - index[j].start, input[j].text.length)+"</div></div>";

                    console.log("Marked gem: "+input[j].text);
                    
                    var lastIndexForMarking = (gemAtIndex + gems[i].name.length - 1);
                    console.log("We have to mark until: "+lastIndexForMarking);
                    
                    // Complete by marking till we are done marking the entire gem in all entries
                    for(var k=j+1;k<index.length;k++){
                        console.log("Next userselection for marking starts at index: "+index[k].start);
                        
                        if(index[k].start <= lastIndexForMarking) {
                            input[k].text = "<div class='gemContainer'><div class='gem' style='font-size:"+gems[i].fontSize+"px' relatedwords='"+JSON.stringify(gems[i].relatedWords)+"'>"+(input[k].text.slice(0,lastIndexForMarking-index[k].start+1)+"</div></div>")+input[k].text.slice(lastIndexForMarking-index[k].start+1,index[k].end);
                            console.log("Marked gem: "+input[k].text);
                            if(index[k].end >= lastIndexForMarking) {
                                console.log("We are done marking all userselections");
                                break;
                            }
                        }else{
                            console.log("We are done marking all userselections.");
                            break;
                        }
                    }   
                }else{
                    console.log("We are NOT overflowing");
                    console.log('user text is: '+input[j].text+'   gemAtIndex: '+gemAtIndex+'   gems[i].name.length+1: '+(gemAtIndex+gems[i].name.length + 1));
                    var actualGem = input[j].text.slice(gemAtIndex - index[j].start, gemAtIndex+gems[i].name.length+1);
                    var replaceWith = input[j].text.slice(0, gemAtIndex - index[j].start)+"<div class='gemContainer'><div class='gem' style='font-size:"+gems[i].fontSize+"px' relatedwords='"+JSON.stringify(gems[i].relatedWords)+"'>"+actualGem+"</div></div>"+input[j].text.slice(gemAtIndex - index[j].start +gems[i].name.length+1, input[j].text.length+1);
                    console.log('actualGem: '+actualGem);
                    console.log('replaceWith: '+replaceWith);
                    input[j].text = replaceWith;
                    console.log("Marked gem: "+input[j].text);
                }
            }
        }
    }
    return input;
}

module.exports = router;
