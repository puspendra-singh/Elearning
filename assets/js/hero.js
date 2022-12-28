
$(document).ready(function(){
	"use strict";


	// SOLID COLOR BACKGROUND FUNCTION
	function colorBackground() {

		// UPDATE COLOR

		$(".hero .level-2").css("background",option_hero_background_color_custom_color);
		$(".hero .level-2").children().remove();

		$(".hero .bg-color").css("opacity","1");

		// REMOVE PATTERN AND OVERLAY
		$(".hero .bg-pattern").remove();
		$(".hero .bg-overlay").remove();

	}


	// CHECK FOR ACTIVE EFFECTS
	function checkforBackgroundEffects() {

		if ( option_hero_gravity_effect === "on" ) {
			gravityBackgroundEffect();
		}

	}

	// LOAD SCRIPT FUNCTION
	function loadScript(url, callback) {

		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;
		script.onreadystatechange = callback;
		script.onload = callback;
		head.appendChild(script);

	}



	// BACKGROUND CONTROLLER
	switch(option_hero_background_mode) {

	
		case "color":

			colorBackground();
			checkforBackgroundEffects();

		break;
		case "gradient":

			gradientBackground();
			checkforBackgroundEffects();

		break;
	
		case "custom":

			customBackground();
			checkforBackgroundEffects();

		break;
		default:

			alert( "Error! No background is set or something went wrong" );
			console.log("Error! No background is set or something went wrong");

		break;

	}



/** 3. EFFECT
*******************************************************************/

	// 2D HOVER EFFECT
	if ( option_hero_parallax_hover_effect == "on") {

		// PARALLAX HOVER EFFECT
		var $scene = $(".hero").parallax({

			scalarX: 24,
			scalarY: 15,
			frictionX: 0.1,
			frictionY: 0.1,

		});

		// DISABLE OR ENABLE PARALLAX ON MOUSEENTER MOUSELEAVE
		$( ".hero" ).hover(

			function() {

				$scene.parallax("enable");

			}, function() {

				$scene.parallax("disable");

			}

		);

	}


	// GRAVITY BACKGROUND EFFECT
	function gravityBackgroundEffect() {

			function Constellation (canvas, options) {

				var screenpointSplitt = 14000,
					movingSpeed = 0.2,
					viewportWidth = $(".hero .level-1").width(),
					viewportHeight = $(".hero .level-1").height(),
					nbCalculated = Math.round(viewportHeight*viewportWidth/screenpointSplitt),
					$canvas = $(canvas),
					context = canvas.getContext("2d"),
					defaults = {
						star: {color: "rgba(255, 205, 0, .65)",width: 1},
						line: {color: "rgba(255, 205, 0, .65)",width: 0.2},
						position: {x: 0,y: 0},
						width: viewportWidth,
						height: viewportHeight,
						velocity: movingSpeed,
						length: nbCalculated,
						distance: 120,
						radius: 200,
						stars: []
					},

					config = $.extend(true, {}, defaults, options);

				function Star () {

					this.x = Math.random() * canvas.width;
					this.y = Math.random() * canvas.height;

					this.vx = (config.velocity - (Math.random() * 0.5));
					this.vy = (config.velocity - (Math.random() * 0.5));

					this.radius = Math.random() * config.star.width;

				}

				Star.prototype = {

					create: function(){

						context.beginPath();
						context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
						context.fill();

					},

					animate: function(){

						var i;
						for (i = 0; i < config.length; i++) {

							var star = config.stars[i];

							if (star.y < 0 || star.y > canvas.height) {

								star.vx = star.vx;
								star.vy = - star.vy;

							} else if (star.x < 0 || star.x > canvas.width) {

								star.vx = - star.vx;
								star.vy = star.vy;

							}

							star.x += star.vx;
							star.y += star.vy;
						}

					},

					line: function(){

						var length = config.length,
							iStar,
							jStar,
							i,
							j;

						for (i = 0; i < length; i++) {

							for (j = 0; j < length; j++) {

								iStar = config.stars[i];
								jStar = config.stars[j];

								if (

									(iStar.x - jStar.x) < config.distance &&
									(iStar.y - jStar.y) < config.distance &&
									(iStar.x - jStar.x) > - config.distance &&
									(iStar.y - jStar.y) > - config.distance

								) {
									if (

										(iStar.x - config.position.x) < config.radius &&
										(iStar.y - config.position.y) < config.radius &&
										(iStar.x - config.position.x) > - config.radius &&
										(iStar.y - config.position.y) > - config.radius

									) {

										context.beginPath();
										context.moveTo(iStar.x, iStar.y);
										context.lineTo(jStar.x, jStar.y);
										context.stroke();
										context.closePath();

									}

								}

							}

						}

					}

				};

				this.createStars = function () {

					var length = config.length,
						star,
						i;

					context.clearRect(0, 0, canvas.width, canvas.height);

					for (i = 0; i < length; i++) {

						config.stars.push(new Star());
						star = config.stars[i];

						star.create();

					}

					star.line();
					star.animate();
					config.stars.splice(length, length);

				};

				this.setCanvas = function () {

					canvas.width = config.width;
					canvas.height = config.height;

					context.fillStyle = config.star.color;
					context.strokeStyle = config.line.color;
					context.lineWidth = config.line.width;

					if (!options || !options.hasOwnProperty("position")) {

						config.position = {

							x: canvas.width * 0.5,
							y: canvas.height * 0.5

						};

					}

				};

				this.loop = function (callback) {

					callback();

					window.requestAnimationFrame(function () {

						this.loop(callback);

					}.bind(this));

				};

				this.bind = function () {

					$(window).on("mousemove", function(e){

						config.position.x = e.pageX - $canvas.offset().left;
						config.position.y = e.pageY - $canvas.offset().top;

					});

				};

				this.init = function () {

					this.setCanvas();
					this.loop(this.createStars);
					this.bind();
				};

			}

			$.fn.constellation = function (options) {

				return this.each(function () {

					var c = new Constellation(this, options);
					c.init();

				});

			};


			$("#canvas canvas").constellation({});



		var waitForFinalEvent = (function () {

		  var timers = {};

		  return function (callback, ms, uniqueId) {

			if (!uniqueId) {

			  uniqueId = "Don't call this twice without a uniqueId";

			}

			if (timers[uniqueId]) {

			  clearTimeout (timers[uniqueId]);

			}

			timers[uniqueId] = setTimeout(callback, ms);

		  };

		})();

		$(window).resize(function () {

			waitForFinalEvent(function(){

					$("#canvas canvas").constellation({});

			}, 500, "some unique string");

		});



	}



});
