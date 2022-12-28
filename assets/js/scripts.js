

/** 1. LOADING
*******************************************************************/

var blockEvents = true;

jQuery(window).on('load', function() {
	"use strict";


	setTimeout(function() {

		$("#page-loader").addClass("hide-this");
		$('#cycle').cycle("goto","0");

		setTimeout(function() {

			$(".hero .background-content.page-enter-animated").addClass("show");

			setTimeout(function() {

				$(".hero .front-content.page-enter-animated").addClass("show");

				blockEvents = false;

			}, 600);

			$(".social-icons li a").tooltip({

				container: 'body',
				delay: { "show": 150, "hide": 0 }

			});

		}, 200);

	}, 600);

});
