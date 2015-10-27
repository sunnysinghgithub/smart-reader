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
		    for(i=0 ; i<input.length; i++){
		        userSelection[i] = input[i].text;
		    }
    		var gems = JSON.parse(response);
		    var index = buildIndex(userSelection);
		    gems = calculateFontSize(gems);
            if(req.session && req.session.user){
                console.log('user searching:'+JSON.stringify(req.session.user));
                console.log('Going to insert gems');
                models.User.findOne({ _id: req.session.user._id }, function (err, user){
                    console.log('Found user!');
                    console.log('user is: '+user);
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
        console.log('searching important word for gem: '+gem.name);
        models.ImportantWords.find({_searchedBy:user_id,words:{'$regex':gem.name}}).exec(function(err, importantWords){
            console.log("Found important words for gem: "+gem.name);
            console.log('importantWords: '+importantWords);
            console.log('number of importantwords object'+importantWords);
            for(var j=0; j<importantWords.length; j++){
                if(importantWords[j].words){
                    gem.relatedWords = JSON.parse(importantWords[j].words).slice(0,4);                    
                }
            }
            searchRelatedGems(i+1, gems, user_id, callback, res, input, userSelection, index, user);
        });
    }else{
        callback(gems, res, input, userSelection, index, user);
    }        
}

function processGems(gems, res, input, userSelection, index, user) {
    if(user){
        var importantWords = new models.ImportantWords;
        importantWords.words = JSON.stringify(gems);
        importantWords._searchedBy = user;
        importantWords.save();        
    }    
    input = markGems(input, userSelection, gems, index);
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
                    console.log("We are overlowing. This user selection is: "+input[j].text);
                    
                    // Mark the part of the gem in the first entry
                   	input[j].text = input[j].text.slice(0,gemAtIndex - index[j].start)+"<span class='gem' style='font-size:"+gems[i].fontSize+"px'>"+input[j].text.slice(gemAtIndex - index[j].start, input[j].text.length)+"</span>";
                    input[j].fontSize = gems[i].fontSize;
                    input[j].relatedWords = gems[i].relatedWords;

                    console.log("Marked gem: "+input[j].text);
                    
                    var lastIndexForMarking = (gemAtIndex + gems[i].name.length - 1);
                    console.log("We have to mark until: "+lastIndexForMarking);
                    
                    // Complete by marking till we are done marking the entire gem in all entries
                    for(var k=j+1;k<index.length;k++){
                        console.log("Next userselection for marking starts at index: "+index[k].start);
                        
                        if(index[k].start <= lastIndexForMarking) {
                            input[k].text = "<span class='gem' style='font-size:"+gems[i].fontSize+"px'>"+(input[k].text.slice(0,lastIndexForMarking-index[k].start+1)+"</span>")+input[k].text.slice(lastIndexForMarking-index[k].start+1,index[k].end);
                            input[k].fontSize = gems[i].fontSize;
                            input[k].relatedWords = gems[k].relatedWords;
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
                    // We are within same entry, so our job is simple :)
					var regEx = new RegExp((gems[i]).name, "ig");
					var match = regEx.exec(input[j].text);
					console.log(match[0]);
					var replaceMask = "<span class='gem' style='font-size:"+gems[i].fontSize+"px'>"+match[0]+"</span>";
                    input[j].text = input[j].text.replace(regEx,replaceMask);
                    input[j].fontSize = gems[i].fontSize;
                    input[j].relatedWords = gems[i].relatedWords;
                    console.log("Marked gem: "+input[j].text);
                }
            }
        }
    }
    return input;
}

module.exports = router;
