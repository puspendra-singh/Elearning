$(function () {
    new Chart(document.getElementById("bar_chart_users").getContext("2d"), getChartJs("users"));
    new Chart(document.getElementById("bar_chart_earnings").getContext("2d"), getChartJsEarnings("earnings"));
});
var aspectRatio = (document.body.offsetWidth < 768) ? false : true;
function getChartJs(userType) { 
    var config 			= 	null;
    var monthsArray 	=   getPreviousMonths();
	$.each(userRecords, function(index,html){
		for(var i=0; i < monthsArray.length; i++) {	
			if(typeof html[monthsArray[i]['month_year']] !== typeof undefined){
				monthsArray[i]['total_user'] 	= (html[monthsArray[i]['month_year']]['total_users']) ? html[monthsArray[i]['month_year']]['total_users'] : 0;
			}
		}
	});

	var months		= [];
	var userCount 	= [];

	for(var i=0; i < monthsArray.length; i++) {
		months.push(monthsArray[i]['name']);
		
		if(typeof monthsArray[i]['total_user'] !== typeof undefined){
			userCount.push(monthsArray[i]['total_user']);
		}else{
			userCount.push(0);
		}
	}


	let dataSets = [];
	if(userType == "users"){
		dataSets.push({
			label: "Users",
			data: userCount.reverse(),
			backgroundColor: 'rgba(63, 81, 181, 0.9)'
		});
	}

	config = {
		type: 'bar',
		data: {
			labels: months.reverse(),
			datasets: dataSets
		},
		options: {
			maintainAspectRatio: aspectRatio,
			responsive: true,
			legend: {
				display		:	false,
				fullWidth	: 	true,
				position 	:	"top",
				labels		: 	{
					fontColor: 'rgb(255, 99, 132)'
				}
			},
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero: true,
						userCallback: function(label, index, labels) {
							if (Math.floor(label) === label) {
								return label;
							}
						},
					}
				}],
			}
		},

	};
    return config;
}

function getChartJsEarnings(userType) { 
    var config 			= 	null;
    var monthsArray 	=   getPreviousMonths();
	console.log(earningRecords);
	$.each(earningRecords, function(index,html){
		for(var i=0; i < monthsArray.length; i++) {
			if(typeof html[monthsArray[i]['month_year']] !== typeof undefined){
				monthsArray[i]['total_amount'] 	= (html[monthsArray[i]['month_year']]['total_amount']) ? html[monthsArray[i]['month_year']]['total_amount'] : 0;
			}
		}
	});

	var months		= [];
	var earnings 	= [];

	for(var i=0; i < monthsArray.length; i++) {
		months.push(monthsArray[i]['name']);
		if(typeof monthsArray[i]['total_amount'] !== typeof undefined){
			earnings.push(monthsArray[i]['total_amount']);
		}else{
			earnings.push(0);
		}
	}


	let dataSets = [];
	if(userType == "earnings"){
		dataSets.push({
			label: "Earnings",
			data: earnings.reverse(),
			backgroundColor: '#607d8b'
		});
	}

	config = {
		type: 'bar',
		data: {
			labels: months.reverse(),
			datasets: dataSets
		},
		options: {
			maintainAspectRatio: aspectRatio,
			responsive: true,
			legend: {
				display		:	false,
				fullWidth	: 	true,
				position 	:	"top",
				labels		: 	{
					fontColor: 'rgb(255, 99, 132)'
				}
			},
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero: true,
						userCallback: function(label, index, labels) {
							if (Math.floor(label) === label) {
								return label;
							}
						},
					}
				}],
			}
		},

	};
    return config;
}

function getPreviousMonths(){
    var theMonths = new Array("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12");
    var theMonthNames = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
    var today = new Date();

    var aMonth 	= today.getMonth();
    var aYear 	= today.getFullYear();

    var i;
    var monthList = new Array();

    for (i=0; i<12; i++) {
        monthList[i] 				=	{};
        monthList[i]['month_year'] 	=  	theMonths[aMonth]+'-'+aYear;
        monthList[i]['name'] 		=	theMonthNames[aMonth]+' '+aYear;
        aMonth--;
        if (aMonth < 0) {
            aMonth = 11;
            aYear--;
        }
    }
    return monthList;
}
