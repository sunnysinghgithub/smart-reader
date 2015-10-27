var ImportantwordsHighlighter = (function() {
	_sendRequestToHighlightImportantWords = function() {
		var request = {
			method : "highlightImpWords"
		};
		_sendMessageToPage(request, function() {console.log('done');});
	};
	_sendMessageToPage = function(request, callback) {
		chrome.tabs.query({
			active : true,
			currentWindow : true
		}, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, request, callback);
		});
	}
	return {
		highlightImportantWords : function() {
			_sendRequestToHighlightImportantWords();
		}
	};
}());

document.addEventListener('DOMContentLoaded', function() {
	document.getElementById('highlightImportantWords').addEventListener(
			'click', ImportantwordsHighlighter.highlightImportantWords);
});