var ImportantWordsProcessor = (function() {
	return {
		highlightImpWords : function() {
			// Rangy initialization
			rangy.init();

			userSelectionApplier = '';

    		classApplierModule = rangy.modules.ClassApplier || rangy.modules.CssClassApplier;	
    		if (rangy.supported && classApplierModule && classApplierModule.supported) {
        		userSelectionApplier = rangy.createClassApplier("userSelection");
    		}

    		// wrap userselection elements
			userSelectionApplier.toggleSelection();

			// Grab each user selected element and assign it a unique ID
			var userSelectionText = [];
			$(".userSelection").each(function() {
    			$(this).uniqueId();
    			var userSelectionElement = {};
    			userSelectionElement.id = $(this).attr("id");
    			userSelectionElement.text = $(this).text();
    			userSelectionText.push(userSelectionElement);
			});					

			// Send the input to the backend
			ImportantWordsProcessor.getImportantWords(userSelectionText);
		},
		getImportantWords : function(userSelectionText) {
			$.ajax({
				method: "POST",
				contentType: "application/json",
				url: "http://192.168.1.122/findgems",
				data: JSON.stringify(userSelectionText),
				dataType: "json",
				success: Highlighter.highlight
			});
		}
	};
}());

var Highlighter = (function() {
	return {
		highlight : function(userSelection) {
			for(i=0; i<userSelection.length; i++){
		    	$("#"+userSelection[i].id).html(userSelection[i].text);
		    }
		}
	};
}());

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.method == "highlightImpWords") {
		ImportantWordsProcessor.highlightImpWords();
	}
});