/**
 *   Function for Submit form on Enter (Pass Submit Button class in Form data-form-submit-class attribute)
 */
$(document).on('keypress','.on_click_submit',function(e){
	var key = e.which;
	if (key == 13) {
		var className = e.target.className;
		if(className.indexOf('notSubmitOnEnter') < 0){
			if(e.shiftKey == 0 || (e.shiftKey == 1 && $(e.target)[0].type!="textarea")){
				var submitId = $(this).attr('data-submit-btn-id');
				$('#'+submitId).trigger('click');
				return false;
			}
		}
	}
});

/**
 *  For chosen resize function
 *
 **/
$(window).on('resize', resizeChosen);

function resizeChosen() {
   $(".chosen-container").each(function() {
       $(this).attr('style', 'width: 100%');
   });
}

/**
 * Function to change language tabs for multi language form
 *
 * @param selectedLangCode As current selected language
 *
 * @return null
 */
function changeTab(selectedLangCode){
	$('.multilanguage_tab').removeClass('current').addClass('done');
	$('.multilanguage_tab_'+selectedLangCode).removeClass('done').addClass('current');
	$('.multi-lang-tab-pane').removeClass('active');
	$('#multi_lang_'+selectedLangCode).addClass('active');
}//end changeTab()

/**
 *	Function for custom ajax submit
 *
 * 	@param var formId 	As form id for submitting form
 * 	@param var callback As Callback Function
 *
 *	@return null
 */
function ajax_submit(formId,callback){
	var options = {
		success:function(response){
			if(response.status == 'success'){
				callback(true,response);
			}else{
				display_errors(response.message,formId);
				callback(false,response);
			}
		},
		resetForm:false
	};
	$("form#"+formId).ajaxSubmit(options);
}//end ajax_submit()

/**
 *	Function for custom ajax submit for multipart form data with multilevel array
 *
 * 	@param var formId as form id for submitting form
 * 	@param var callback for callback function
 *
 *	@return null
 */
function submit_multipart_form(formId,callback){
	/** take all form input values in Object format */
	var formData	= $('#'+formId).serializeObject();

	/** FormData is used to submit multipart/form-data */
	var fd 			= new FormData();
	if(formData != undefined){
		$.each(formData,function(key,value){
			/** Append all input values into FormData object */
			if(typeof value == 'object'){
				fd.append(key, JSON.stringify(value));
			}else{
				fd.append(key, value);
			}
		});
	}

	/** Form data is used to submit multipart/form-data */
	var fileData	= $('input[type="file"]');
	if(fileData != undefined){
		$.each(fileData,function(key,value){
			if(value.files[0]!= undefined){
				var name = (value.name) ? value.name : '';
				if(value.multiple != undefined && value.multiple != false){
					var filesValue = (value.files) ? value.files : '';
					$.each(filesValue,function(keyFile,valueFile){
						fd.append(name+"["+keyFile+"]", valueFile);
					});
				}else{
					var filesValue = (value.files[0]) ? value.files[0] : '';
					fd.append(name, filesValue);
				}

				/** Append all file input values into FormData object */
			}
		});
	}
	var currentUrl = (window.location && window.location.href) ? window.location.href : '';
	var options = {
		url: currentUrl,
		type: "POST",
		data : fd,
		processData : false,
		contentType : false,
		success:function(response){
			if(response.status == 'success'){
				callback(true,response);
			}else{
				display_errors(response.message,formId);
				callback(false,response);
			}
		}
	};
	$.ajax(options);
}//end submit_multipart_form()

/**
 *	Function for display validation errors
 *
 * 	@param var errors As Array or errors
 * 	@param var formId As Form id for display errors
 *
 *	@return null
 */
function display_errors(errors,formId){
	$firstError = '';
	$('#'+formId+' span.error').html('');
	$('#'+formId).find('.form-line').removeClass('error');
	if(typeof errors == "object"){
		try{
			$.each(errors,function(index,html){
				if(html.param == 'invalid-access'){
					if($firstError == ''){
						$firstError = 'user-defined-notice';
					}
					notice('error',html.msg);
				}else{
					var errorId = html.param;
					if($firstError == ''){
						$firstError = errorId;
					}
					$('#'+formId+' #'+errorId+'_error').prev('.form-line').addClass('error');
					$('#'+formId+' #'+errorId+'_error').html(html.msg).show();
				}
			});
		}catch(e){
			notice('error','Something went wrong, Please try again.');
			$firstError = 'user-defined-notice';
		}
	}else{
		notice('error',errors);
		$firstError = 'user-defined-notice';
	}
	if($firstError != ''){
		var scrollTopId = '#'+$firstError;
		if($firstError != 'user-defined-notice'){
			if($('#'+$firstError+'_error').length > 0){
				$('#'+$firstError+'_error').focus();
			}
			scrollTopId = '#'+formId+' #'+$firstError+'_error';
		}
		if($(scrollTopId).length > 0){
			$("html,body").animate({scrollTop: $(scrollTopId).offset().top - 150}, "slow");
		}
	}
}//end display_errors()

/**
 * Function For For notification messages
 *
 *	@param title 	as Title
 *  @param message 	as Notification Message
 *  @param type 	as Type ('success'/'error'/'info')
 *
 *  @return null
 */
function notice(type,message,timeout){
	timeout = (timeout) ? timeout : 10000;
	$class 	= '';
	switch(type){
		case 'error':
			$class = 'bg-red';
		break;
		case 'success':
			$class = 'bg-green';
		break
	}
	$html = '<div class="alert '+$class+' alert-dismissible" role="alert">\
				<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>\
				'+message+'\
			</div>';
	if(type=="error"){
		$('#user-defined-error-notice').html($html).show();
		if($('#user-defined-error-notice').length > 0){
			$("html,body").animate({scrollTop: $('#user-defined-error-notice').offset().top - 150}, "slow");
		}
		if(timeout != 0){
			setTimeout(function(){
				$('#user-defined-error-notice').fadeOut(500,function(){
					$('#user-defined-error-notice').html('');
				});
			},timeout);
		}
	}
	if(type=="success"){
		$('#user-defined-notice').html($html).show();
		if($('#user-defined-notice').length > 0){
			$("html,body").animate({scrollTop: $('#user-defined-notice').offset().top - 150}, "slow");
		}
		if(timeout != 0){
			setTimeout(function(){
				$('#user-defined-notice').fadeOut(500,function(){
					$('#user-defined-notice').html('');
				});
			},timeout);
		}
	}
}// end notice()

/**
 * Function to show confirm box
 *
 * @param type		As Type of mesage
 * @param title		As Title of comfirm Box
 * @param message	As Confirmation message
 * @param callback  As Callback function
 *
 * @return null
 */
var timer;
function confirmBox(type,title,message,callback){
	clearTimeout(timer);
	swal({
		title: title,
		text: message,
		type: type,
		showCancelButton: true,
		confirmButtonColor: "#DD6B55",
		confirmButtonText: "Ok",
		closeOnConfirm: false,
		showLoaderOnConfirm: true,
	}, function () {
		callback();
	});
}//end confirmBox()



/**
 * Function to show success message
 *
 * @param type		As Type of mesage
 * @param title 	As Title of comfirm Box
 * @param message	As Confirmation message
 *
 * @return null
 */
function popup_success(type,title,message){
	swal(title, message, type);
	timer = setTimeout(function(){
		swal.close();
	},3000);
}//end popup_success()

/**
 * Function to show html popup message
 *
 * @param type		As Type of mesage
 * @param title 	As Title of comfirm Box
 * @param message	As Confirmation message
 *
 * @return null
 */
function html_popup_success(type,title,message,timerCount){
	swal({
		type : type,
		title: title,
		text: message,
		html: true
	});
	timer = setTimeout(function(){
		swal.close();
	},timerCount);
}//end html_popup_success()

/**
 * This funciton in used replace submit button with loading button
 *
 * @params buttonId = Button Id
 *
 * @return null
 **/
function startTextLoading(buttonId){
	$('#'+buttonId).button('loading');
}//end startTextLoading()

/**
 * This funciton in used replace loading button with submit button
 *
 * @params buttonId = Button Id
 *
 * @return null
 **/
function stopTextLoading(buttonId){
	$('#'+buttonId).button('reset');
	setTimeout(function(){
		$('#'+buttonId+' .waves-ripple').remove();
	},1);
}//end stopTextLoading()

/**
 * This funciton in use to update all ckeditor's value in it's textarea element
 *
 * @params void
 *
 * @return null
 **/
function updateCkeditorValue(){
	for (instance in CKEDITOR.instances) {
		CKEDITOR.instances[instance].updateElement();
	}
}//end updateCkeditorValue()

/**
 * This funciton in used to set date time format using moment js
 *
 * @params void
 *
 * @return null
 **/
function setDateTimeformat(){
	$('.setDateTimeFormat').each(function(){
		var dateTime 		= ($(this).attr('data-timestamp')) ? parseInt($(this).attr('data-timestamp')) : $(this).attr('data-date-time');
		var dateTimeFormat 	= ($(this).attr('data-time-format')) ? $(this).attr('data-time-format') : DATATABLE_DATE_TIME_FORMAT;
		var newTime 		= (dateTime) ? moment(dateTime).tz(DEFAULT_TIME_ZONE).format(dateTimeFormat) : "N/A";
		$(this).text(newTime);
	});
}//end setDateTimeformat()


/**
 * This funciton in used to set date time format using moment js
 *
 * @params void
 *
 * @return null
 **/
function setDateFormat(dateTime, dateTimeFormat){
	var newTime 		= (dateTime) ? moment(dateTime).tz(DEFAULT_TIME_ZONE).format(dateTimeFormat) : "N/A";
	return newTime;
}//end setDateTimeformat()


setDateTimeformat();

/**
 * This funciton in used to replace \n tag with br tag
 *
 * @params void
 *
 * @return null
 **/
function nl2br(html){
	if(html){
		return html.replace(/\n/g, "<br />");
	}else{
		return html;
	}
}//end nl2br()
nl2br();


/**
 *  Function for Confirmation message
 */
$(document).on('click', '.confirm_box', function(e){
	e.stopImmediatePropagation();
	url 				= $(this).attr('data-href');
	confirmMessage 		= $(this).attr('data-confirm-message');
	confirmHeading 		= $(this).attr('data-confirm-heading');
	confirmBox("warning",confirmHeading,confirmMessage,function(result){
		window.location.replace(url);
	});
	e.preventDefault();
});

/**
 *  Read more text
 **/
function readMore(){
	// Configure/customize these variables.
	var defaultChar 	= 100;  // default characters value
	var ellipsestext 	= "...";
	var moretext 		= "Read more »";
	var lesstext 		= "Read less »";

	$('.readmore').each(function() {
		if(!($(this).hasClass("readmore_imported"))){
			showChar = ($(this).attr('data-content-length')) ? $(this).attr('data-content-length') : defaultChar;
			var content = $(this).html();
			if(content.length > showChar) {
				var c = content.substr(0, showChar);
				var h = content.substr(showChar, content.length - showChar);
				var html = c + '<span class="moreellipses">' + ellipsestext+ '&nbsp;</span><span class="morecontent"><span>' + h + '</span>&nbsp;&nbsp;<a href="" class="morelink">' + moretext + '</a></span>';
				$(this).addClass('readmore_imported');
				$(this).html(html);
			}
		}
	});

	$(".morecontent span").hide();
}// end readMore()

/**
 *  Call read more function
 *
 **/
readMore();

/**
 * Show and hide text
 **/
$(document).on('click',".morelink",function(){
	var moretext 		= "Read more »";
	var lesstext 		= "Read less »";
	if($(this).hasClass("less")) {
		$(this).removeClass("less");
		$(this).html(moretext);
	} else {
		$(this).addClass("less");
		$(this).html(lesstext);
	}
	$(this).parent().prev().toggle();
	$(this).prev().toggle();
	return false;
});

/**
 *   Function for socket requests to users
 */
/*if(SOCKET_ENABLE && typeof io !== typeof undefined){
	var client = io.connect(WEBSITE_SOCKET_URL, {'transports': ['websocket']});
	client.on('connect',function (data) {
		client.emit('login', {id: encryptionKey});
	});
}
*/
/* If user logged in */
if(typeof encryptionKey !== typeof undefined){
	/**Get Notification Counter*/
	function getHeaderNotificationCounter(){
		$.ajax({
			url : WEBSITE_ADMIN_URL+'notifications/get_header_notifications_counter',
			type: "POST",
			success:function(response){
				/**Notification conter*/
				var notificationCounter = (response.counter) ? response.counter : 0;
				if(notificationCounter){
					if(notificationCounter > 1000){
						notificationCounter = "1000+";
					}
					$("#notificationCounter").text(notificationCounter);
					$("#notificationCounter").removeClass("hide");
				}else{
					$("#notificationCounter").text("");
					$("#notificationCounter").addClass("hide");
				}
			}
		});
	};//End getHeaderNotificationCounter()

	/** Function to get header notification*/
	var isNotificationsLoaded = false;
	function getHeaderNotificaions(){
		if(!isNotificationsLoaded){
			isNotificationsLoaded = true;
			// put loader
			$("#notificationList").html('<li class="text-center"><a href="javascript:void(0);" class="waves-effect waves-block not_anchor"><div class="menu-info"><img src="'+WEBSITE_ADMIN_IMG_URL+'pagination_loader.svg"/> </div></a></li>');
			$("#viewAllNofication").hide();
			$.ajax({
				url : WEBSITE_ADMIN_URL+'notifications/get_header_notifications',
				type: "POST",
				success:function(response){
					if(response){
						$("#notificationList").html("");
						if(typeof response.result !== typeof undefined && response.result && response.result.length > 0){
							var notificationList = (response.result) ? response.result : [];
							notificationList.map(function(notification){
								var iconBgClass 	= (NOTIFICATION_MESSAGES[notification.notification_type] && NOTIFICATION_MESSAGES[notification.notification_type].icon_class) 	? NOTIFICATION_MESSAGES[notification.notification_type].icon_class	: "bg-blue";
								var icon 			= (NOTIFICATION_MESSAGES[notification.notification_type] && NOTIFICATION_MESSAGES[notification.notification_type].icon) 		? NOTIFICATION_MESSAGES[notification.notification_type].icon 		: "notifications";
								var notificaionUrl 	= (notification.url && notification.url != "javascript:void(0);") 	? notification.url 	   		: "javascript:void(0);";
								var unseenClass 	= (notification.is_seen != SEEN) ? "unseen_notification" : "";
								var notificaionTime = (notification.created) 				? notification.created 	: "";
								var notificaionMsg 	= (notification.message) 				? notification.message 	: "";

								if(notificaionMsg.length > 30){
									notificaionMsg 	= notificaionMsg.substr(0, 30)+'...';
								}

								//Append html
								var notifictioanLi = '<li>'+
									'<a href="'+notificaionUrl+'" class="waves-effect waves-block '+unseenClass+'">'+
										'<div class="icon-circle '+iconBgClass+'">'+
											'<i class="material-icons">'+icon+'</i>'+
										'</div>'+
										'<div class="menu-info">'+
											'<h4 class="font-weight-normal">'+notificaionMsg+'</h4>'+
											'<p><i class="material-icons">access_time</i>'+
												' <span class="setDateTimeFormat" data-date-time="'+notificaionTime+'"></span>'+
											'</p>'+
										'</div>'+
									'</a>'+
								'</li>';
								$("#notificationList").append(notifictioanLi);
								$("#viewAllNofication").show();
							});
							setDateTimeformat(); //to show dates
						}else{
							/**No record found */
							var notifictioanLi = '<li class="text-center">'+
								'<a href="javascript:void(0);" class="waves-effect waves-block not_anchor">'+
									'<div class="menu-info">'+
										'<h4 class="no_record_text">You do not have any notification.</h4>'+
									'</div>'+
								'</a>'+
							'</li>';
							$("#notificationList").append(notifictioanLi);
						}
						$("#notificationCounter").text("");
						$("#notificationCounter").addClass("hide");
					}
				}
			});
		}else{
			$("#notificationCounter").text("");
			$("#notificationCounter").addClass("hide");
			return false;
		}
	};//End getHeaderNotificaions()

	$( document ).ready(function() {
		//getHeaderNotificationCounter();//get notification counter
	});

	/**
		 * Function to get new notificaion and update counter
		 */
	/*if(SOCKET_ENABLE){
		
		client.on("notification_received",function(data){
			isNotificationsLoaded = false;
			getHeaderNotificationCounter();//get counter
		});
	}*/

	/**
	 *  Function to round number
	 */
	function customRound(value, precision){
		try{
			if(!value || isNaN(value)){
				return value;
			}else{
				precision 		= 	(typeof precision != typeof undefined && precision) ? precision :ROUND_PRECISION;
				var multiplier 	= 	Math.pow(10, precision || 0);
				return Math.round(value * multiplier) / multiplier;
			}
		}catch(e){
			return value;
		}
	}//end customRound();

	/**
	 *  Function to convert currency format
	 *
	 * @param amount as currency value
	 *
	 * @return amount after convert currency format
	 */
	function currencyFormat(amount) {
		if(!amount || isNaN(amount)){
			return CURRENCY_SYMBOL+amount;
		}else{
			amount	=	customRound(amount,ROUND_PRECISION);
			amount 	=	amount.toString();
			var afterPoint = '';

			if(amount.indexOf('.') > 0) afterPoint = amount.substring(amount.indexOf('.'),amount.length);
			amount = Math.floor(amount);
			amount = amount.toString();
			var lastThree = amount.substring(amount.length-3);
			var otherNumbers = amount.substring(0,amount.length-3);
			if(otherNumbers != '') lastThree = ',' + lastThree;
			return CURRENCY_SYMBOL+otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + afterPoint;
		}
	}// end currencyFormat()

	/**
	 *  Function to convert numeric value in number format (like 3000 => 3,0000)
	 *
	 * @param value as a numeric value
	 *
	 * @return numeric value after convert format
	 */
	function numberFormat(value){
		if(!value || isNaN(value)){
			return value;
		}else{
			value	=	round(value,ROUND_PRECISION);
			value 	=	value.toString();
			var afterPoint = '';

			if(value.indexOf('.') > 0) afterPoint = value.substring(value.indexOf('.'),value.length);
			value = Math.floor(value);
			value =	value.toString();
			var lastThree = value.substring(value.length-3);
			var otherNumbers = value.substring(0,value.length-3);
			if(otherNumbers != '') lastThree = ',' + lastThree;
			return  otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + afterPoint;
		}
	}// end numberFormat()
}


	/**
	* This funciton in used to generate a link for user id according to roles
	*
	* @params userName as User Name
	* @params userId as User Id
	* @params userRoleId as User Role
	*
	* @return html
	**/
	function generateUserLink(userName,userId,userRoleId,userType){
		var html = "";
		if((userName!="" && userId != "" && userRoleId!="" && userType) && (userRoleId == FRONT_USER_ROLE_ID || userRoleId == FRONT_USER_ROLE_ID)){
			html = '<a href="'+WEBSITE_ADMIN_URL+"users/"+userType+"/view/"+userId+'" target="_blank">'+userName+'</a>'
		}else{
			if(userName != ""){
				html = userName;
			}else{
				html = "N/A";
			}
		}
		return html;
	}//end generateUserLink()

	/**
	* This funciton in used to get dropdown list 
	*
	* @params id as parent id
	*
	* @return html
	**/
	function getDropdownList(data, levelName){
		let parentId =  data.split(",")[0];
		if(parentId){
			$.ajax({
				url : WEBSITE_ADMIN_URL+'courses/syllabusHtml/'+parentId,
				type: "POST",
				data : {parent_id : [parentId], level_name : levelName},
				success:function(response){
					$("#subject").html("");
					if(response.status == 'success'){
						$("#subject").html("");
						$("#subject").html(response.list);
						$('#subject').selectpicker('refresh');
					}else{
						$("#subject").html("");
						$('#subject').selectpicker('refresh');
					}
				}
			});
		}else{
			$("#subject").html("<option>Nothing to select</option");
			$('#subject').selectpicker('refresh');
		}
	}// End getDropdownList

	/**
	* This funciton in used to get category list 
	*
	* @params userId as user id
	*
	* @return html
	**/
	function getCategoryList(userId){
		if(userId){
			$.ajax({
				url : WEBSITE_ADMIN_URL+'category/categoryHtml/'+userId,
				type: "POST",
				success:function(response){

					/** Category data*/
					$("#category").html("");
					if(response.status == 'success'){
						$("#category").html("");
						$("#category").html(response.category_list);
						$('#category').selectpicker('refresh');
					}else{
						$("#category").html("");
						$('#category').selectpicker('refresh');
					}

					/** sub Category data*/
					$("#sub_category").html("");
					if(response.status == 'success'){
						$("#sub_category").html("");
						$("#sub_category").html(response.subcategory_list);
						$('#sub_category').selectpicker('refresh');
					}else{
						$("#sub_category").html("");
						$('#sub_category').selectpicker('refresh');
					}
				}
			});
		}else{
			$("#category").html("<option>Nothing to select</option");
			$('#category').selectpicker('refresh');
		}
	}// End getSubcategoyList


	/**
	* This funciton in used to get city list 
	*
	* @params countryId as country
	*
	* @return html
	**/
	function getCityList(countryId){
		if(countryId){
			$.ajax({
				url : WEBSITE_ADMIN_URL+'cities/'+countryId,
				type: "POST",
				data : {country_id : countryId},
				success:function(response){
					$("#city").html("");
					if(response.status == 'success'){
						$("#city").html("");
						$("#city").html(response.city_list);
						$('#city').selectpicker('refresh');
					}else{
						$("#city").html("");
						$('#city').selectpicker('refresh');
					}
				}
			});
		}else{
			$("#city").html("<option>Nothing to select</option");
			$('#city').selectpicker('refresh');
		}
	}// End getCityList

DEFAULT_QUESTION_OPTION_LENGTH = 5;
QUESTION_OPTION_NAME = ['A','B','C','D','E','F'];

/*** Upload document file */
var inputs = document.querySelectorAll( '.inputfile' );
Array.prototype.forEach.call( inputs, function( input ){
	
	var label= input.nextElementSibling,
	labelVal = label.innerHTML;

	input.addEventListener( 'change', function( e ){
		var fileName = '';
		if( this.files && this.files.length > 0 ){
				fileName = ( this.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', this.files.length );	
		}//else fileName = e.target.value.split( "/" ).pop();
		if( fileName ) label.querySelector( 'span' ).innerHTML = fileName;
		else label.innerHTML = labelVal;
	});
});

	/** Select all records */
	$(".checkAll").on("click",function(){
		if (this.checked) {
            $(".checkSingle").each(function() {
                this.checked=true;
            });
        } else {
            $(".checkSingle").each(function() {
                this.checked=false;
            });
        }                            
	});

	/** Select single records */
	$(".checkSingle").click(function () {
        if ($(this).is(":checked")) {
            var isAllChecked = 0;

            $(".checkSingle").each(function() {
                if (!this.checked)
                    isAllChecked = 1;
            });

            if (isAllChecked == 0) {
                $(".checkedAll").prop("checked", true);
            }     
        }
        else {
            $(".checkedAll").prop("checked", false);
        }
    });

	/** Function is used to delete selected records
	 * @moudlename as path
	 */
	function sendNotification(formId, callback){
		var selectedRows = [];
		$('input.checkSingle:checkbox:checked').each(function () {
			selectedRows.push($(this).val());
		});

		let subject = $("#subject").val();
		let description = $("#description").val();
		$.ajax({
			url : WEBSITE_ADMIN_URL+'notifications/send',
			type: "POST",
			data : {'selected_rows' :  selectedRows, subject : subject, description : description},
			success:function(response){
				if(response.status == 'success'){
					callback(true,response);
				}else{
					display_errors(response.message,formId);
					callback(false,response);
				}
			}
		});
	}