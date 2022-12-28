BREADCRUMBS = {
	/**EDIT PROFILE SECTION**/
	'admin/user_profile/edit' : [{name:'Edit profile',url:'',icon:'mode_edit'}],

	/**USERS MANAGEMENT SECTION**/
	'admin/users/list' 	: 	[{name:'Users',url:'',icon:'person'}],
	'admin/users/edit' 	: 	[{name:'Users',url:WEBSITE_ADMIN_URL+'users/',icon:'person'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/users/add'	: 	[{name:'Users',url:WEBSITE_ADMIN_URL+'users/',icon:'person'},{name:'Add',url:'',icon:'person_add'}],
	'admin/users/view' 	:	[{name:'Users',url:WEBSITE_ADMIN_URL+'users/',icon:'person'},{name:'View',url:'',icon:'find_in_page'}],


	/**CMS SECTION**/
	'admin/cms/list' :	[{name:'Content Management',url:'',icon:'picture_in_picture'}],
	'admin/cms/edit' : 	[{name:'Content Management',url:WEBSITE_ADMIN_URL+'cms',icon:'picture_in_picture'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/cms/add'	 : 	[{name:'Content Management',url:WEBSITE_ADMIN_URL+'cms',icon:'picture_in_picture'},{name:'Add',url:'',icon:'add'}],

	/**Slider SECTION**/
	'admin/slider/list' :	[{name:'Slider Management',url:'',icon:'picture_in_picture'}],
	'admin/slider/edit' : 	[{name:'Slider Management',url:WEBSITE_ADMIN_URL+'slider',icon:'picture_in_picture'},{name:'Edit slider',url:'',icon:'mode_edit'}],
	'admin/slider/add'	 : 	[{name:'Slider Management',url:WEBSITE_ADMIN_URL+'slider',icon:'picture_in_picture'},{name:'Add slider',url:'',icon:'add'}],
	
	/**TEXT SETTING SECTION**/
	'admin/text_setting/list' : [{name:'dynamic_variable',url:'',icon:'text_format'}],
	'admin/text_setting/edit' : [{name:'dynamic_variable',url:WEBSITE_ADMIN_URL+'text-setting/{dynamic_variable}',icon:'text_format'},{name:'Edit Text Setting',url:'',icon:'mode_edit'}],
	'admin/text_setting/add' : [{name:'dynamic_variable',url:WEBSITE_ADMIN_URL+'text-setting/{dynamic_variable}',icon:'text_format'},{name:'Add Text Setting',url:'',icon:'add'}],

	/**EMAIL MANAGEMENT SECTION**/
	'admin/email_template/list' : [{name:'Email Templates',url:'',icon:'contact_mail'}],
	'admin/email_template/add' : [{name:'Email Templates',url:WEBSITE_ADMIN_URL+'email_template',icon:'contact_mail'},{name:'Add',url:'',icon:'add'}],
	'admin/email_template/edit' : [{name:'Email Templates',url:WEBSITE_ADMIN_URL+'email_template',icon:'contact_mail'},{name:'Edit',url:'',icon:'mode_edit'}],


	/** EMAIL LOGS SECTION**/
	'admin/email_logs/list' : [{name:'Email Logs',url:'',icon:'mail_outline'}],
	'admin/email_logs/view' : [{name:'Email Logs',url:WEBSITE_ADMIN_URL+'email_logs',icon:'mail_outline'},{name:'Email Logs Details',url:'',icon:'find_in_page'}],

	
	/** Sms LOGS SECTION**/
	'admin/sms_logs/list' : [{name:'Sms Logs',url:'',icon:'textsms'}],
	'admin/sms_logs/view' : [{name:'Sms Logs',url:WEBSITE_ADMIN_URL+'sms_logs',icon:'textsms'},{name:'Sms Log Details',url:'',icon:'find_in_page'}],

	/**SETTING MANAGEMENT SECTION**/
	'admin/setting/list' 	: [{name:'Settings',url:'',icon:'settings'}],
	'admin/setting/add'  	: [{name:'Settings',url:WEBSITE_ADMIN_URL+'settings',icon:'settings'},{name:'Add Setting',url:'',icon:'add'}],
	'admin/setting/edit' 	: [{name:'Settings',url:WEBSITE_ADMIN_URL+'settings',icon:'settings'},{name:'Edit Setting',url:'',icon:'mode_edit'}],
	'admin/setting/prefix' 	: [{name:'dynamic_variable',url:'',icon:'settings'}],

	/**MASTER MANAGEMENT SECTION**/
	'admin/master/list' : [{name:'dynamic_variable',url:'',icon:'subject'}],
	'admin/master/add' 	: [{name:'dynamic_variable',url:WEBSITE_ADMIN_URL+'master/{dynamic_variable}',icon:'subject'},{name:'Add',url:'',icon:'add'}],
	'admin/master/edit' : [{name:'dynamic_variable',url:WEBSITE_ADMIN_URL+'master/{dynamic_variable}',icon:'subject'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/master/view' : [{name:'dynamic_variable',url:WEBSITE_ADMIN_URL+'master/{dynamic_variable}',icon:'subject'},{name:'View',url:'',icon:'find_in_page'}],

	/**ADMIN ROLE SECTION**/
	'admin/admin_role/list' : [{name:'Manage Roles',url:'',icon:'security'}],
	'admin/admin_role/add'  : [{name:'Manage Roles',url:WEBSITE_ADMIN_URL+'admin_role',icon:'security'},{name:'Add',url:'',icon:'add'}],
	'admin/admin_role/edit' : [{name:'Manage Roles',url:WEBSITE_ADMIN_URL+'admin_role',icon:'security'},{name:'Edit',url:'',icon:'edit'}],

	/**ADMIN PERMISSIONS SECTION**/
	'admin/admin_permissions/list' : [{name:'Sub-admin',url:'',icon:'perm_data_setting'}],
	'admin/admin_permissions/add'  : [{name:'Sub-admin',url:WEBSITE_ADMIN_URL+'admin_permissions',icon:'perm_data_setting'},{name:'Add',url:'',icon:'add'}],
	'admin/admin_permissions/edit' : [{name:'Sub-admin',url:WEBSITE_ADMIN_URL+'admin_permissions',icon:'perm_data_setting'},{name:'Edit',url:'',icon:'edit'}],
	'admin/admin_permissions/view' : [{name:'Sub-admin',url:WEBSITE_ADMIN_URL+'admin_permissions',icon:'perm_data_setting'},{name:'View',url:'',icon:'find_in_page'}],

	/** ADMIN MODULES SECTION**/
	'admin/admin_modules/list' : [{name:'Admin Modules',url:'',icon:'pages'}],
	'admin/admin_modules/add'  : [{name:'Admin Modules',url:WEBSITE_ADMIN_URL+'admin_modules',icon:'pages'},{name:'Add Admin Modules',url:'',icon:'add'}],
	'admin/admin_modules/edit' : [{name:'Admin Modules',url:WEBSITE_ADMIN_URL+'admin_modules',icon:'pages'},{name:'Edit Admin Modules',url:'',icon:'edit'}],

	/**TEXT GROUP SETTING SECTION**/
	'admin/text_group_setting/list' : [{name:'Text Group Setting',url:'',icon:'new_releases'}],
	'admin/text_group_setting/view' : [{name:'Text Group Setting',url:WEBSITE_ADMIN_URL+'text_group_setting',icon:'new_releases'},{name:'View Text Group Setting',url:'',icon:'find_in_page'}],
	'admin/text_group_setting/edit' : [{name:'View Text Group Setting ',url:WEBSITE_ADMIN_URL+'text_group_setting/{dynamic_variable}/view',icon:'text_format'},{name:'Edit Text Setting',url:'',icon:'mode_edit'}],
	'admin/text_group_setting/import': [{name:'Text Group Setting',url:WEBSITE_ADMIN_URL+'text_group_setting',icon:'new_releases'},{name:'Import Text Group Setting',url:'',icon:'find_in_page'}],

	/** Contact SECTION**/
	'admin/contact_us/list' 	: [{name:'Contact Us',url:'',icon:'contact_mail'}],
	'admin/contact_us/view'	: [{name:'Contact Us',url:WEBSITE_ADMIN_URL+'contact_us',icon:'contact_mail'},{name:'View',url:'',icon:'find_in_page'}],
	
	/** FAQ SECTION**/
	'admin/faqs/list' : [{name:'Faq',url:'',icon:'contact_mail'}],
	'admin/faqs/add'  : [{name:'Faq',url:WEBSITE_ADMIN_URL+'faq',icon:'contact_mail'},{name:'Add',url:'',icon:'add'}],
	'admin/faqs/edit'  : [{name:'Faq',url:WEBSITE_ADMIN_URL+'faq',icon:'contact_mail'},{name:'Edit',url:'',icon:'edit'}],
	'admin/faqs/view' : [{name:'Faq',url:WEBSITE_ADMIN_URL+'faq',icon:'contact_mail'},{name:'View',url:'',icon:'find_in_page'}],

	/** TESTIMONIALS SECTION**/
	"admin/testimonials": [{ name: "Testimonials", url: "", icon: "add" }],
	"admin/testimonials/add" : [{ name: "Testimonials",  url: WEBSITE_ADMIN_URL + "testimonials", icon: "add" },{ name: "Add", url: "",  icon: "add" },],
	"admin/testimonials/edit": [{ name: "Testimonials", url: WEBSITE_ADMIN_URL + "testimonials", icon: "edit" }, { name: "Edit", url: "", icon: "edit" },],

	/**TOPIC/UNITS SECTION**/
	'admin/units/list' : [{name:'Units',url:'',icon:'kitchen'}],
	'admin/units/edit' : [{name:'Units',url:WEBSITE_ADMIN_URL+'units/',icon:'kitchen'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/units/add'  : [{name:'Units',url:WEBSITE_ADMIN_URL+'units/',icon:'kitchen'},{name:'Add',url:'',icon:'add'}],
	'admin/units/view' : [{name:'Units',url:WEBSITE_ADMIN_URL+'units/',icon:'kitchen'},{name:'View',url:'',icon:'find_in_page'}],
	'admin/units/document_list' : [{name:'Units',url:WEBSITE_ADMIN_URL+'units/',icon:'kitchen'},{name:'Documents',url:'',icon:'find_in_page'}],
	'admin/units/document_add' : [{name:'Units',url:WEBSITE_ADMIN_URL+'units/',icon:'kitchen'},{name:'Documents',url:WEBSITE_ADMIN_URL+'units/documents/{dynamic_variable}',icon:'image'},{name:'Add',url:'',icon:'add'}],
	'admin/units/document_edit' : [{name:'Units',url:WEBSITE_ADMIN_URL+'units/',icon:'kitchen'},{name:'Documents',url:WEBSITE_ADMIN_URL+'units/documents/{dynamic_variable}',icon:'image'},{name:'Edit',url:'',icon:'mode_edit'}],

	/** OTHER RESOURCES SECTION**/
	'admin/other_resources/list' : [{name:'Other Resources',url:'',icon:'event_note'}],
	'admin/other_resources/edit' : [{name:'Other Resources',url:WEBSITE_ADMIN_URL+'other_resources/',icon:'event_note'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/other_resources/add'  : [{name:'Other Resources',url:WEBSITE_ADMIN_URL+'other_resources/',icon:'event_note'},{name:'Add',url:'',icon:'person_add'}],
	'admin/other_resources/view' : [{name:'Other Resources',url:WEBSITE_ADMIN_URL+'other_resources/',icon:'event_note'},{name:'View',url:'',icon:'find_in_page'}],
	
	/**VIDEO LESSON SECTION  */
	'admin/video_lessons/list' : [{name:'Video Lessons',url:'',icon:'video_library'}],
	'admin/video_lessons/edit' : [{name:'Video Lessons',url:WEBSITE_ADMIN_URL+'video_lessons/',icon:'video_library'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/video_lessons/add'  : [{name:'Video Lessons',url:WEBSITE_ADMIN_URL+'video_lessons/',icon:'video_library'},{name:'Add',url:'',icon:'person_add'}],
	'admin/video_lessons/view' : [{name:'Video Lessons',url:WEBSITE_ADMIN_URL+'video_lessons/',icon:'video_library'},{name:'View',url:'',icon:'find_in_page'}],

	/**QUESTION SECTION**/
	'admin/question/list' :	[{name:'Questions',url:'',icon:'question_answer'}],
	'admin/question/edit' : [{name:'Questions',url:WEBSITE_ADMIN_URL+'questions',icon:'question_answer'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/question/add'  : [{name:'Questions',url:WEBSITE_ADMIN_URL+'questions',icon:'question_answer'},{name:'Add',url:'',icon:'add'}],

	/**PAST PAPERS SECTION**/
	'admin/past_papers/list' :	[{name:'Past Papers',url:'',icon:'question_answer'}],
	'admin/past_papers/edit' : [{name:'Past Papers',url:WEBSITE_ADMIN_URL+'past_papers',icon:'question_answer'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/past_papers/add'  : [{name:'Past Papers',url:WEBSITE_ADMIN_URL+'past_papers',icon:'question_answer'},{name:'Add',url:'',icon:'add'}],

	/**NOTIFICATION SECTION**/
	'admin/notifications/list' :	[{name:'Notifications',url:'',icon:'notifications_active'}],
	'admin/notifications/edit' : [{name:'Notifications',url:WEBSITE_ADMIN_URL+'notifications',icon:'notifications_active'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/notifications/add'  : [{name:'Notifications',url:WEBSITE_ADMIN_URL+'notifications',icon:'notifications_active'},{name:'Add',url:'',icon:'add'}],
				
	/**COURSES SECTION**/
	'admin/courses/list' :	[{name:'Courses',url:'',icon:'layers'}],
	'admin/courses/edit' : [{name:'Courses',url:WEBSITE_ADMIN_URL+'courses',icon:'layers'},{name:'Edit',url:'',icon:'mode_edit'}],
	'admin/courses/add'  : [{name:'Courses',url:WEBSITE_ADMIN_URL+'courses',icon:'layers'},{name:'Add',url:'',icon:'add'}],
	
	'admin/subjects/list'  : [{name:'Subjects',url:'',icon:'subject'}],
	'admin/subjects/add'  : [{name:'Subjects',url:WEBSITE_ADMIN_URL+'subjects',icon:'subject'},{name:'Add',url:'',icon:'add'}],
	'admin/subjects/edit'  : [{name:'Subjects',url:WEBSITE_ADMIN_URL+'subjects',icon:'subject'},{name:'Edit',url:'',icon:'mode_edit'}],

	/**EXAMINATIONS SECTION**/
	'admin/examinations/list' :	[{name:'Examinations',url:'',icon:'book'}],
	'admin/examinations/add' : [{name:'Examinations',url:WEBSITE_ADMIN_URL+'examinations',icon:'book'},{name:'Add',url:'',icon:'add'}],
	'admin/examinations/view'  : [{name:'Examinations',url:WEBSITE_ADMIN_URL+'examinations',icon:'book'},{name:'View',url:'',icon:'find_in_page'}],
	'admin/examinations/result'  : [{name:'Examinations',url:WEBSITE_ADMIN_URL+'examinations',icon:'book'},{name:'Result',url:'',icon:'find_in_page'}],

	/**SUBSCRIPTION PLAN SECTION**/
	'admin/subscription_plans/list'  : [{name:'Subscription Plans',url:'',icon:'subtitles'}],
	'admin/subscription_plans/add' 	 : [{name:'Subscription Plans',url:WEBSITE_ADMIN_URL+'subscription_plans',icon:'subtitles'},{name:'Add',url:'',icon:'add'}],
	'admin/subscription_plans/view'  : [{name:'Subscription Plans',url:WEBSITE_ADMIN_URL+'subscription_plans',icon:'subtitles'},{name:'View',url:'',icon:'find_in_page'}],
	'admin/subscription_plans/edit'  : [{name:'Subscription Plans',url:WEBSITE_ADMIN_URL+'subscription_plans',icon:'subtitles'},{name:'Edit',url:'',icon:'mode_edit'}]
};


