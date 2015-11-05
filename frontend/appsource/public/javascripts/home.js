var Home = (function() {
	_toggleUserSelection = function() {
		showeverything = $('#checkbox-usersel').bootstrapSwitch('state');
		if(showeverything){
			$('#gems .not-gem').fadeIn("slow");
		}else {
			$('#gems .not-gem').fadeOut("slow");
		}
	},
	_bindEventHandlers = function() {
		$("#btn-home").click(function() {
			location.href="/home";
		});
		$('#form-main').submit(Home.findGems);
		$('#btn-start-over').click(function() {
			$(".result").hide('slide',{direction: 'right'}, 200, function() {
				// Slide in the header
				$("#header").show('slide',{direction: 'left'}, 200);
				// Slide in the Home section
				$('#form-main').show('slide',{direction: 'left'}, 200);
			});
		});
		$('#btn-logout').click(Home.logout);
		$('#btn-login-twitter').click(Home.loginWithTwitter);
		$("#btn-login-overlay").fancybox({
		    autoScale: true,
		    autoSize: false,
		    href : '#login',
		    padding: 0,
		    closeClick : false,
		    titleShow : false,
        	transitionIn : 'elastic',
        	transitionOut : 'elastic',
        	width: '800px',
        	height: '390px'
		}); // fancybox
		$("#btn-register-overlay").fancybox({
		    autoScale: true,
		    autoSize: false,
		    href : '#register',
		    padding: 0,
		    closeClick : false,
		    titleShow : false,
        	transitionIn : 'elastic',
        	transitionOut : 'elastic',
        	width: '800px',
        	height: '450px'
		}); // fancybox
	},
	_showDisplaySwitch = function() {
		$('#checkbox-usersel').bootstrapSwitch({
			onText: "All", 
			offText: "Gems", 
			offColor: "success",
			labelText: "Showing",
			state: "false", 
			onSwitchChange: _toggleUserSelection
		});
	},
	_showRelatedGems = function(event) {
		var wordX = event.pageX;
    	var wordY = event.pageY;
    	if($(this).attr("relatedwords")){
	    	var relatedWordsArr = JSON.parse($(this).attr("relatedwords"));
			console.log(JSON.stringify(relatedWordsArr));
			var $canvas=$(".relatedWordsCanvas");
			$canvas.css({"z-index":"20"});
			$canvas.css('background-color', 'rgba(89, 85, 83, 0.8)');
			var canvas = $canvas.get(0);
			canvas.width  = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
			var ctx = canvas.getContext('2d');
			var radius = 70;
		    //var coords = _findCoordsOfPoints(canvas.width/2, canvas.height/2, radius+40, relatedWordsArr);    
		    var coords = _findCoordsOfPointsHorizontal(canvas.width,canvas.height,relatedWordsArr);
			console.log(coords);
		    for(var i=0; i<relatedWordsArr.length; i++){
		        var coord = coords[i];
		        console.log("drawing bubble at origin: "+coord.X+","+coord.Y);
		        _drawBubble(ctx, radius, coord.X,coord.Y,relatedWordsArr[i]);
		    }
		    $(".gem").css({"z-index":"21","text-decoration":"underline"});
    	}  
	},
	_drawBubble = function(ctx, radius, x, y, relatedGem) {
	    ctx.beginPath();
	    ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
	    ctx.lineWidth=(relatedGem.fontSize/15)*4.0;
	    innerCircleRadius = (relatedGem.fontSize/15)*0.4*radius;
	   	var grd=ctx.createRadialGradient(x,y,innerCircleRadius,x,y,radius);		
		grd.addColorStop(0,"white");
		grd.addColorStop(1,"rgba(245, 208, 76, 0.4)");
	    ctx.arc(x, y, radius, 0, 2*Math.PI, false);  
	    ctx.fillStyle = grd;
	    ctx.fill();
	    ctx.stroke();
	    ctx.fillStyle = "black";
	    var font = "bold " + 15 +"pt Calibri";
	    ctx.font = font;
	    ctx.textBaseline = "top";
	    ctx.textAlign = 'center';
	    ctx.fillText(relatedGem.name, x,y-10);
	},
	_findCoordsOfPoints = function(wordX, wordY, radius, relatedGems){
	    var angle = (2*Math.PI)/relatedGems.length;
	    console.log('angle: '+angle);
	    var startAngle = 0;
	    var coords = [];
	    for(var i=0; i<relatedGems.length; i++){
	        var X = wordX + radius*Math.sin(startAngle);
	        var Y = wordY - radius*Math.cos(startAngle);
	        coords.push({"X":X, "Y":Y});
	        startAngle = startAngle+angle;
	    }
	    return coords;
	},
	_findCoordsOfPointsHorizontal = function(canvasWidth, canvasHeight, relatedGems){
		var widthForEachSegment = 150;
		var next=500;
		var coords = [];
		for(var i=0; i<relatedGems.length; i++){			
			coords.push({"X":next, "Y":150});
			next = next+widthForEachSegment;
		}
		return coords;
	}
	return 	{
		onload : function() {
			_bindEventHandlers();			
			$(".result").hide();
			$("#header").hide().show("slow");
			$('#form-main').hide().show("slow");
			$("#btn-findgems").fadeTo(800,0.5).fadeTo(800,1.0).fadeTo(800,0.5).fadeTo(800,1.0).fadeTo(800,0.5).fadeTo(800,1.0);
		},
		findGems : function(e) {
			e.preventDefault();
			// Get the userText
			userSelection  = {};
			userSelectionText = [];
			userSelection.id = 'u-id-0';
			userSelection.text = $('#usertext').val();
			userSelectionText.push(userSelection);
			var spinner = new Spinner().spin();
			// Send the userText to backend.
			$.ajax({
				method: "POST",
				contentType: "application/json",
				url: "/findgems",
				data: JSON.stringify(userSelectionText),
				dataType: "json",
				beforeSend: function() {
					$('#form-main').append(spinner.el);
				},
				success: function(response) {
					spinner.stop();
					// Hide the header
					$("#header").hide('slide',{direction: 'left'}, 500);
					// Hide the Home section
					$('#form-main').hide('slide',{direction: 'left'}, 500, Home.renderGems(response));					
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					spinner.stop();
					alert("some error");
				}
			});
		},
		renderGems : function(gems) {
			$(".result").show('slide',{direction: 'right'}, 500, function(){
				_showDisplaySwitch();
				//Hide the success alert
				$(".alert").fadeOut(3000);
				$('#gems').show("slow");
				$('#gems').html(gems[0].text);
				$('#gems').contents()
					.filter(function(){return this.nodeType === 3})
					.wrap('<div class="not-gem" />');
				$('.gem').click(_showRelatedGems);
			});
		},
		loginWithTwitter : function() {
			var spinner = new Spinner().spin();
			$.ajax({
				method: "GET",
				contentType: "application/json",
				url: "/login/twitter",
				beforeSend: function() {
					$('#login').append(spinner.el);
				},
				success: function(response) {
					spinner.stop();
					var resObj = JSON.parse(response);
					document.location.href = resObj.location;
				}
			});
		},
		logout : function() {
			var spinner = new Spinner().spin();
			$.ajax({
				method: "POST",
				contentType: "application/json",
				url: "/logout",				
				beforeSend: function() {
					$('body').append(spinner.el);
				},
				success: function(response) {
					spinner.stop();
					// redirect user to root
			        window.location = '/';
				}
			});
		}
	};
})();
$(document).ready(Home.onload);