/** Website root directory path */
WEBSITE_ROOT_PATH	=	process.env.PWD + "/";
SITE_TITLE 			=	process.env.SITE_TITLE


/** Website Push notification server key for Android devices */
WEBSITE_PN_ANDROID_SERVER_KEY =	process.env.ANDROID_SERVER_KEY;
/** Website Header Auth Key for mobile api */
WEBSITE_HEADER_AUTH_KEY	= 	process.env.API_HEADER_AUTH_KEY;

/** Website/Socket Url*/
WEBSITE_URL			=	process.env.URL+":"+process.env.PORT+"/";
WEBSITE_FRONT_URL   =   process.env.FRONT_URL
WEBSITE_API_URL		=	process.env.URL+":"+process.env.PORT+"/api";
WEBSITE_SOCKET_URL	=  	process.env.URL+":"+process.env.PORT;

/** Front end name **/
FRONT_END_NAME          = "/";
/** Admin name **/
ADMIN_NAME              = "admin";
/** Front end folder name */
FRONT_END_FOLDER_NAME   = "frontend";
/** Admin folder name */
ADMIN_FOLDER_NAME       = "admin";

/** Website public directory path */
WEBSITE_PUBLIC_PATH 			= 	WEBSITE_URL + "public/";


/** Website public folder path of front end*/
WEBSITE_FILES_URL				= 	WEBSITE_PUBLIC_PATH + ADMIN_FOLDER_NAME+"/";
WEBSITE_FRONT_FILES_URL         = 	WEBSITE_PUBLIC_PATH + FRONT_END_FOLDER_NAME+"/";

/** Js file path for front pages of website */
WEBSITE_JS_PATH 				= 	WEBSITE_FILES_URL + "js/";
/** Js Path for specific pages */
WEBSITE_JS_PAGE_PATH			= 	WEBSITE_JS_PATH + "pages/";
/** Css file path for front pages of website*/
WEBSITE_CSS_PATH 				= 	WEBSITE_FILES_URL + "css/";
/** vendor file path for front pages of website*/
WEBSITE_VENDOR_PATH 			= 	WEBSITE_FILES_URL + "vendor/";
/** Website images directory url */
WEBSITE_IMG_URL 				= 	WEBSITE_FILES_URL + "images/";
/** Website public images directory url */
WEBSITE_PUBLIC_IMG_URL			= 	WEBSITE_PUBLIC_PATH + FRONT_END_FOLDER_NAME+'/';
/**Js plugin directory path */
WEBSITE_JS_PLUGIN_PATH			= 	WEBSITE_FILES_URL + "plugins/";
/** Website Modules root path */
WEBSITE_MODULES_PATH		    = 	WEBSITE_ROOT_PATH + "modules/"+FRONT_END_FOLDER_NAME+"/";
/** Front layout root path */
WEBSITE_LAYOUT_PATH				= 	WEBSITE_ROOT_PATH + "modules/"+FRONT_END_FOLDER_NAME+"/layouts/";

/** Website Admin site Url */
WEBSITE_ADMIN_URL				= 	WEBSITE_URL+ADMIN_NAME+"/";
/** Website public folder path of Admin panel*/
WEBSITE_ADMIN_FILES_URL			= 	WEBSITE_PUBLIC_PATH + ADMIN_FOLDER_NAME+"/";
/** Js file path for admin pages of website */
WEBSITE_ADMIN_JS_PATH 			= 	WEBSITE_ADMIN_FILES_URL + "js/";
/** Js Path for specific pages */
WEBSITE_ADMIN_JS_PAGE_PATH		= 	WEBSITE_ADMIN_JS_PATH + "pages/";
/** Css file path for admin pages of website*/
WEBSITE_ADMIN_CSS_PATH 			= 	WEBSITE_ADMIN_FILES_URL + "css/";
/** Website images directory url for admin */
WEBSITE_ADMIN_IMG_URL 			= 	WEBSITE_ADMIN_FILES_URL + "images/";
/**Js plugin directory path */
WEBSITE_ADMIN_JS_PLUGIN_PATH	= 	WEBSITE_ADMIN_FILES_URL + "plugins/";
/** Admin Modules root path */
WEBSITE_ADMIN_MODULES_PATH		= 	WEBSITE_ROOT_PATH + "modules/"+ADMIN_FOLDER_NAME+"/";
/** Admin layout root path */
WEBSITE_ADMIN_LAYOUT_PATH		= 	WEBSITE_ROOT_PATH + "modules/"+ADMIN_FOLDER_NAME+"/layouts/";

/** Website public uploads directory path */
WEBSITE_PUBLIC_UPLOADS_PATH 	=	WEBSITE_PUBLIC_PATH + FRONT_END_FOLDER_NAME+"/uploads/";

/** Website upload directory root path */
WEBSITE_UPLOADS_ROOT_PATH		= 	WEBSITE_URL + "public/"+FRONT_END_FOLDER_NAME+"/uploads/";

/** Root file */
BASE_FILE_PATH = WEBSITE_ROOT_PATH + "/public/frontend/uploads/";
BASE_FILE_URL  = WEBSITE_URL + "public/frontend/uploads/";


/** For User images file directory path and url*/
USERS_FILE_PATH		=	BASE_FILE_PATH+"user/";
USERS_URL			=	BASE_FILE_URL+"user/";


TESTIMONIAL_FILE_PATH = BASE_FILE_PATH+"testimonial/";
TESTIMONIAL_FILE_URL  = BASE_FILE_URL+"testimonial/";

/** For other resources file directory path and url*/
OTHER_RESOURCES_FILE_PATH	=	BASE_FILE_PATH+"other_resources/";
OTHER_RESOURCES_URL	=	BASE_FILE_URL+"other_resources/";

/** For video lesson file directory path and url*/
VIDEO_LESSON_FILE_PATH = BASE_FILE_PATH+"video_lessons/";
VIDEO_LESSON_URL	= BASE_FILE_URL+"video_lessons/";

/** For subject icon file directory path and url*/
SUBJECT_ICON_FILE_PATH	=	BASE_FILE_PATH+"subject_icons/";
SUBJECT_ICON_URL	=	BASE_FILE_URL+"subject_icons/";

/** For subject icon file directory path and url*/
MASTER_FILE_PATH	=	BASE_FILE_PATH+"masters/";
MASTER_FILE_URL	=	BASE_FILE_URL+"masters/";

EXAMINER_MIND_FILE_PATH = BASE_FILE_PATH+"examiner_mind/";
EXAMINER_MIND_FILE_URL = BASE_FILE_URL+"examiner_mind/";


PAST_PAPER_FILE_PATH = BASE_FILE_PATH+"past_papers/";
PAST_PAPER_FILE_URL = BASE_FILE_URL+"past_papers/";

/** Urls of commonly used images */
NO_IMAGE_AVAILABLE		=	WEBSITE_PUBLIC_UPLOADS_PATH + "no-image.jpg";
ADD_PROFILE_IMAGE_ICON	= 	WEBSITE_PUBLIC_UPLOADS_PATH+'user-no-image.png';
IMAGE_FIELD_NAME 		= 	"full_image_path";

/** User role ids */
SUPER_ADMIN_ROLE_ID	= 	"5fa8ddc28fb791c512f7a9c4";
FRONT_USER_ROLE_ID	= 	"5b6bc82b1dd6a1219e632b04";

/** Text Setting types*/
TEXT_SETTINGS_ADMIN	= "admin";
TEXT_SETTINGS_FRONT	= "front";

/** Name of text setting types*/
TEXT_SETTINGS_NAME						=	{};
TEXT_SETTINGS_NAME[TEXT_SETTINGS_ADMIN]	=	"Admin Text Settings";
TEXT_SETTINGS_NAME[TEXT_SETTINGS_FRONT]	=	"Front Text Settings";

/** Text Setting types*/
TEXT_SEARCH_DROPDOWN = [
	{status_id	: TEXT_SETTINGS_ADMIN, status_name	: "Admin"},
	{status_id	: TEXT_SETTINGS_FRONT, status_name	: "Front"},
];

SENT_STATUS_SEARCH_DROPDOWN = [];

/** Time Configurations */
DAYS_IN_A_WEEK				= 	7;
HOURS_IN_A_DAY				= 	24;
MINUTES_IN_A_HOUR 			= 	60;
SECONDS_IN_A_MINUTE 		= 	60;
MILLISECONDS_IN_A_SECOND	=	1000;
SECONDS_IN_A_HOUR			= 	3600;
DAY_IN_A_MONTH				= 	30;
HOURS_IN_A_YEAR				= 	HOURS_IN_A_DAY*365;

/** Time stamp of one day*/
ONE_DAY_TIMESTAMP = HOURS_IN_A_DAY*MINUTES_IN_A_HOUR*SECONDS_IN_A_MINUTE*MILLISECONDS_IN_A_SECOND;

/** One mile value in meter use in get store by miles  **/
ONE_MILE_IN_METER =	1609.344;

/** One mile value in km use in convert km into miles  **/
ONE_MILE_IN_KMS =	0.621371;

/** Commonly used status **/
ACTIVE 			=	1;
DEACTIVE 		= 	0;
VERIFIED 		= 	1;
NOT_VERIFIED	= 	0;
DELETED			= 	1;
NOT_DELETED		= 	0;
NOT_SEEN		= 	0;
SEEN			= 	1;
NOT_READ		= 	0;
READ			= 	1;
SENT			=	1;
NOT_SENT		=	0;
SHOWN    		= 	1;
NOT_SHOWN   	= 	0;
NOT_REGISTER	= 	0;
REGISTER 	 	= 	1;
NOT_VISIBLE   	= 	0;
VISIBLE   		= 	1;
NOT_AVAILABLE   = 	0;
AVAILABLE   	= 	1;
REJECTED		=	2;
OFFLINE   		= 	0;
ONLINE			=	1;
NOT             =   0;
APPROVED 		= 	5;

/** Activity Type */
ONLINE_OFFLINE_ACTIVITY = "online_offline";
LOGIN_LOGOUT_ACTIVITY 	= "login_logout";

ONLINE_ACTIVITY 	= "online_activity";
OFFLINE_ACTIVITY 	= "offline_activity";
LOGIN_ACTIVITY 		= "login_activity";
LOGOUT_ACTIVITY 	= "logout_activity";

/** Gender type*/
MALE			= "male";
FEMALE			= "female";
GENDER_OTHER	= "other";

GENDER_DROPDOWN 				= {};
GENDER_DROPDOWN[MALE] 			= "Male";
GENDER_DROPDOWN[FEMALE]			= "Female";
GENDER_DROPDOWN[GENDER_OTHER]	= "Other";

/** "Stay Signed In" Expire time for admin  */
ADMIN_LOGGED_IN_COOKIE_EXPIRE_TIME = 14 * ONE_DAY_TIMESTAMP;

/** Type of Flash messages */
STATUS_SUCCESS 	= "success";
STATUS_ERROR 	= "error";

/** Show / Hide "Stay Signed In" Option in admin */
ALLOWED_ADMIN_TO_SET_COOKIE	=	ACTIVE;

/** Default number of records to be shown in admin */
ADMIN_LISTING_LIMIT		=	10;
FRONT_LISTING_LIMIT		=	10;

/** On submit loading text */
ADMIN_LOADING_TEXT	= 'data-loading-text=\'<i class="material-icons font-14">save</i> Loading...\'';
FRONT_LOADING_TEXT	= 'data-loading-text=\'<i class="material-icons font-14">save</i> Loading...\'';


LANGUAGE_CODES = {};
/** English language configurations */
ENGLISH_LANGUAGE_MONGO_ID		= "5fa923fb8fb791c512f7dc9a";
ENGLISH_LANGUAGE_CODE			= "en";
ENGLISH_LANGUAGE_FOLDER_CODE	= "en";
LANGUAGE_CODES[ENGLISH_LANGUAGE_MONGO_ID] = ENGLISH_LANGUAGE_CODE;

/** Default language configurations */
DEFAULT_LANGUAGE_MONGO_ID		= ENGLISH_LANGUAGE_MONGO_ID;
DEFAULT_LANGUAGE_FOLDER_CODE	= ENGLISH_LANGUAGE_FOLDER_CODE;
DEFAULT_LANGUAGE_CODE			= ENGLISH_LANGUAGE_CODE;

LANGUAGES_IN_SYSTEM = [
	ENGLISH_LANGUAGE_MONGO_ID,
];

STANDARD_EXAM_SOLUTIONS = "637627b1d2f20912941e3472";

/** Upload image configurations*/
ALLOWED_IMAGE_EXTENSIONS 			=	["jpg","jpeg","png"];
ALLOWED_IMAGE_ERROR_MESSAGE			= 	"Please select valid file, Valid file extensions are "+ALLOWED_IMAGE_EXTENSIONS.join(",  ")+".";

ALLOWED_IMAGE_MIME_EXTENSIONS 		= 	["image/jpg","image/jpeg","image/png"];
ALLOWED_IMAGE_MIME_ERROR_MESSAGE	= 	"Please select valid mime type, Valid mime types are "+ALLOWED_IMAGE_MIME_EXTENSIONS.join(", ")+".";
IMAGE_RESOLUTION		 			=	"1202*424";

/** Upload document configurations*/
ALLOWED_FILE_EXTENSIONS 			=	["pdf"];
ALLOWED_FILE_ERROR_MESSAGE			= 	"Please select valid file, Valid file extensions are "+ALLOWED_FILE_EXTENSIONS.join(", ")+".";

ALLOWED_FILE_MIME_EXTENSIONS 		= 	["application/pdf"];
ALLOWED_FILE_MIME_ERROR_MESSAGE		= 	"Please select valid mime type, Valid mime types are "+ALLOWED_FILE_MIME_EXTENSIONS.join(", ")+".";


/** Upload video configurations*/
ALLOWED_VIDEO_EXTENSIONS 			=	["mp4"];
ALLOWED_VIDEO_ERROR_MESSAGE			= 	"Please select valid file, Valid file extensions are "+ALLOWED_VIDEO_EXTENSIONS.join(", ")+".";

ALLOWED_VIDEO_MIME_EXTENSIONS 		= 	["video/mp4","application/mp4"];
ALLOWED_VIDEO_MIME_ERROR_MESSAGE	= 	"Please select valid mime type, Valid mime types are "+ALLOWED_VIDEO_MIME_EXTENSIONS.join(", ")+".";


/** Not allowed html tags list*/
NOT_ALLOWED_TAGS_XSS = [/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*/gi];

/** Allow iframe in add/edit product (Youtube embedded code) **/
NOT_ALLOWED_TAGS_XSS_WITHOUT_IFRAME = [/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi];

/** Date Formats  for server side (node js) **/
DATABASE_DATE_TIME_FORMAT	= 	"yyyy-mm-dd HH:MM:ss";	// 2019-01-01 00:00:00
DATABASE_DATE_FORMAT		= 	"yyyy-mm-dd"; 			// 2019-01-01
DATE_FORMAT_EXPORT 			=	"dd/mm/yyyy";
EXPIRY_DATE_FORMAT	 		=	"dd/mm/yyyy";
DATE_TIME_FORMAT_EXPORT 	=	"dd/mm/yyyy hh:MM TT"; // 01/01/2019 11:00 AM
DATE_OF_BIRTH_FORMAT		= 	"yyyy-mm-dd"; 			// 2019-01-01
AM_PM_FORMAT_WITH_DATE 		= 	"yyyy-mm-dd hh:MM TT"; 	// 2019-01-01 11:00 AM
API_DATE_TIME_FORMAT		= 	"yyyy-mm-dd HH:MM:ss";	// 2019-01-01 00:00:00
API_DATE_FORMAT				= 	"yyyy-mm-dd";	// 2019-01-01 00:00:00

START_DATE_TIME_FORMAT		= 	"00:00:00";	// 2019-01-01 00:00:00

/**Date formats For client side only */
FRONT_DATE_FORMAT			= 	"DD/MM/YYYY hh:MM A"; 			// 31/01/2018 00:00 PM
DATATABLE_DATE_TIME_FORMAT	=	"DD/MM/YYYY hh:mm a";
DATATABLE_DATE_FORMAT		=	"DD/MM/YYYY";
DATE_FORMAT_HTML			=	"DD/MM/YYYY";
GRAPH_DATE_FORMAT			=	"mm/dd/yyyy";

CURRENTDATE_START_DATE_FORMAT	=	"yyyy-mm-dd 00:00:00";
CURRENTDATE_END_DATE_FORMAT		=	"yyyy-mm-dd 23:59:59";

/**Date formats used in datetange picker	 */
DATEPICKER_DATE_FORMAT					=	"DD/MM/YYYY";
DATEPICKER_START_DATE_FORMAT			=	"YYYY-MM-DD 00:00:00";
DATEPICKER_END_DATE_FORMAT				=	"YYYY-MM-DD 23:59:59";
DATE_RANGE_DISPLAY_FORMAT_FOR_START_DATE=	"YYYY-MM-DD HH:mm:00";
DATE_RANGE_DISPLAY_FORMAT_FOR_END_DATE 	=	"YYYY-MM-DD HH:mm:59";
DATE_RANGE_DATE_TIME_FORMAT				=	"YYYY-MM-DD HH:mm";
DATE_RANGE_DATE_FORMAT				 	=	"YYYY-MM-DD";
DATEPICKER_TIME_FORMAT					=	"HH:mm";

/** Date picker date example*/
DATEPICKER_DATE_EXAMPLE		=	"Ex: 2019-03-24 23:59";
ADMIN_JS_AM_PM_DATE_FORMAT  =   "DD/MM/YYYY hh:MM A";

/** Time zone used in html **/
DEFAULT_TIME_ZONE	= process.env.TZ;

/** To show error message on top of page **/
ADMIN_GLOBAL_ERROR 	= "invalid-access";
FRONT_GLOBAL_ERROR 	= "invalid-access";

/** Datatable configurations **/
SORT_DESC	 	= 	-1;
SORT_ASC	 	= 	1;
DEFAULT_SKIP	=	0;

/** Loading button text, default is loading.. **/
LOADING_BUTTON_TEXT = 'data-loading-text=\'<i class="fa fa-save"></i> Loading...\'';
LOADING_SPINNER = '<div class=\'ld ld-ring ld-spin\'></div>';

/** Default country code */
DEFAULT_COUNTRY_CODE	=	"+91";

/** Allowed Mobile number length configuration **/
MOBILE_NUMBER_MIN_LENGTH		= 	9;
MOBILE_NUMBER_MAX_LENGTH		= 	11;
MOBILE_LENGTH_VALIDATION		=	{};
MOBILE_LENGTH_VALIDATION["min"]	=	MOBILE_NUMBER_MIN_LENGTH;
MOBILE_LENGTH_VALIDATION["max"]	=	MOBILE_NUMBER_MAX_LENGTH;
MOBILE_NUMBER_LENGTH			=	[MOBILE_LENGTH_VALIDATION];

MOBILE_NUMBER_REGULAR_EXPRESSION	=	"^[0-9]{10,11}$";

EXAM_MIN_DURATION                   =   10;
EXAM_MAX_DURATION                   =   180;

/** Password length configuration **/
PASSWORD_MIN_LENGTH					= 	6;
PASSWORD_MAX_LENGTH					= 	30;
PASSWORD_ALPHANUMERIC_REGEX         =   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d#$@!%&*?]{6,30}$/;
PASSWORD_LENGTH_VALIDATION			=	{};
PASSWORD_LENGTH_VALIDATION["min"]	=	PASSWORD_MIN_LENGTH;
PASSWORD_LENGTH_VALIDATION["max"]	=	PASSWORD_MAX_LENGTH;
PASSWORD_LENGTH						=	[PASSWORD_LENGTH_VALIDATION];

/** FAQ length configuration **/
FAQ_QUESTION_MIN_LENGTH	=	5
FAQ_QUESTION_MAX_LENGTH =   250
FAQ_ANS_MIN_LENGTH		= 5
FAQ_ANS_MAX_LENGTH		= 500

/** Slider length configuration **/
SLIDER_NAME_MIN_LENGTH  = 5;
SLIDER_NAME_MAX_LENGTH  = 250;
SLIDER_DESCRIPTION_MIN_LENGTH  = 5;
SLIDER_DESCRIPTION_MAX_LENGTH  = 500;

TITLE_MIN_LENGTH = 5;
TITLE_MAX_LENGTH = 250;

DESCRIPTION_MIN_LENGTH = 5;
DESCRIPTION_MAX_LENGTH = 350;

NAME_MIN_LENGTH = 3;
NAME_MAX_LENGTH = 30;
NAME_ALPHANUMERIC_REGEX = /^([a-zA-Z0-9_ ]){3,30}$/;

/** Email and Mobile validation regular expression (use in login function for front) **/
/** Email and 10 digit mobile number validation */
EMAIL_AND_MOBILE_REGULAR_EXPRESSION					= /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})|(^[0-9]{10,11})+$/;
EMAIL_AND_MOBILE_REGULAR_EXPRESSION_FOR_CLIENT_SIDE	= "^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})|(^[0-9]{10,11})+$";

EMAIL_REGULAR_EXPRESSION					= /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
/** settings input value required and editable status **/
REQUIRED 	=	1;
EDITABLE 	=	1;

/** Round precision (default number of decimal digits to round to) **/
ROUND_PRECISION = 2;

VALIDATE_STRING_ROUND = 10;

/** to ignore Case sensitive searching/sorting in mongo collections  **/
COLLATION_VALUE		=	{ locale: "en_US", caseLevel: true};

/** Dashboard redirect type **/
TYPE_ACTIVE		=	"active";
TYPE_DEACTIVE 	= 	"deactive";

/** Type Of Export Records **/
EXPORT_ALL		= "export_all";
EXPORT_FILTERED	= "export_filtered";

/** Search status for global section **/
GLOBAL_STATUS_SEARCH_DROPDOWN			=	{};
GLOBAL_STATUS_SEARCH_DROPDOWN[ACTIVE]	=	{
	status_name	:	"Active",
	status_type	: 	TYPE_ACTIVE,
	label_class	: 	"label-success"
};
GLOBAL_STATUS_SEARCH_DROPDOWN[DEACTIVE]	=	{
	status_name	:	"Inactive",
	status_type	: 	TYPE_DEACTIVE,
	label_class	: 	"label-danger"
};

/** For data table data types **/
NUMERIC_FIELD 	= 'numeric';
OBJECT_ID_FIELD = 'objectId';
EXACT_FIELD		= 'exact';

/** For status use in redirect page with status (user listing) **/
ACTIVE_INACTIVE_STATUS	=	"active_inactive";
VERIFIED_STATUS			=	"verified_user";

/** Setting validate type dropdown **/
SETTINGS_VALIDATE_TYPE_DROPDOWN = [
	{
		input_id	: "number",
		input_name	: "Number"
	},
	{
		input_id	: "float",
		input_name	: "Float"
	},
];

/** Setting input type dropdown **/
SETTING_INPUT_TYPE_DROPDOWN = [
	{
		input_id	: "text",
		input_name	: "Text"
	},
	{
		input_id	: "textarea",
		input_name	: "Textarea"
	}
];

/** Not allowed characters in regular expresssion **/
NOT_ALLOWED_CHARACTERS_FOR_REGEX = ['(',')','+','*','?','[',']'];

/**Not deletable role */
NOT_DELETABLE_ROLE	= 1;

/** Two show only subadmin */
IS_SUBADMIN	= 1;

/**Notificaiton dispaly limit in admin header */
ADMIN_HEADER_NOTIFICATION_DISPLAY_LIMIT = 5;
FRONT_HEADER_NOTIFICATION_DISPLAY_LIMIT = 5;

/**Maximum character allowed to display on listing page */
MAX_CHARACTER_ALLOWED_IN_LISTING = 200;

/**To genrate random numbers */
DEFAULT_RANDOM_NUMBER_LENGTH = 6;

/**Search Status for pn logs **/
SEARCHING_ANDROID	= "Android";
SEARCHING_IPHONE	= "iPhone";

/** Search status for pn logs **/
PN_LOGS_DEVICE_TYPE_SEARCH_DROPDOWN = [
	{device_id	: SEARCHING_ANDROID,device_name	: "Android"},
	{device_id	: SEARCHING_IPHONE,device_name	: "iPhone"},
];

/** Used for genrate password */
BCRYPT_PASSWORD_SALT_ROUNDS = 1;

/***Payment configration */
CURRENCY = "NGN";
/** Default currency for payments */
CURRENCY_SYMBOL	=	'₦';
/** To test message functionality in development */
INDIA_COUNTRY_CODE  	= '+91';


/**  NOTIFICATION TYPE */
NOTIFICATION_USER_EXAM 				= 1;
NOTIFICATION_USER_APPROVAL_STATUS	= 2;
NOTIFICATION_USER_PLAYER_REQUEST 	= 3;


NOTIFICATION_MESSAGES ={};
NOTIFICATION_MESSAGES[NOTIFICATION_USER_EXAM] = {
	'title' 	: 'New Exam',
	'message' 	: 'One exam',
	'constants'	: ['{USER_NAME}'],
	'icon_class': 'bg-light-green',
	'icon'		: 'notifications_active'
};

NOTIFICATION_MESSAGES[NOTIFICATION_USER_APPROVAL_STATUS] = {
	'title' 	: 'Admin user status',
	'message' 	: 'Your account has been {STATUS} by middleware.',
	'constants'	: ['{STATUS}'],
	'icon_class': 'bg-light-green',
	'icon'		: 'notifications_active'
};


/*** Newsletter template */
CONSTANT_FOR_NEWSLETTER_TEMPLATE = [
	{constant_id	: "NAME", constant_name	: "NAME"},
]



NEWSLETTER_DEFAULT_USER_NAME = '';


/**Email sent events */
USER_REGISTRATION_EMAIL_EVENTS 				 = "user_registration";
USER_CONTACT_US_EVENTS 				 		 = "contact_us";
USER_VERIFICATION_EMAIL_EVENTS				 = "account_verification";
USER_ACCOUNT_APPROVAL_EMAIL_EVENTS			 = "user_account_approval";
USER_NEWS_LETTER_SUBSCRIPTION_EVENTS		 = "new_subscription_request";
NEWS_LETTER_MAILTO_USER_SUBSCRIPTION_EVENTS  = "reply_to_user_subscription_request";

/**Contact us message max length */
CONTACT_MESSAGE_TEXT_LENGTH			= 200;
REJECTION_MESSAGE_TEXT_LENGTH		= 200;


/**Search Status for users **/
SEARCHING_ACTIVE 				= 1;
SEARCHING_DEACTIVE 				= 2;
SEARCHING_VERIFIED 				= 3;
SEARCHING_NOT_VERIFIED			= 4;
SEARCHING_APPROVED 				= 5;
SEARCHING_PENDING				= 6;
SEARCHING_REJECTED				= 7;


/** Search status for user **/
USER_STATUS_SEARCH_DROPDOWN = [
	{
		status_id	: SEARCHING_ACTIVE,
		status_name	: "Active",
		status_type	: TYPE_ACTIVE
	},
	{
		status_id	: SEARCHING_DEACTIVE,
		status_name	: "Inactive",
		status_type	: TYPE_DEACTIVE
	}
];


ONEDAY 	= 1000 * 60 * 60 * 24;

/** Constant for display on home page */
DISPLAY 		=	1;
NOT_DISPLAY 	=	0;

DEFAULT_AUTH_TOKEN		=	"Bearer 6LcFPeEUAAAAAM0SVkEQSj_f1awQtVOlf40LS-n_";

FCM_SERVER_KEY = "f-4UEFBKT4KirYoJ0aZR0F:APA91bEttbDIMSAT1ay0D2Oihg1ty07XLF-xBktkuFdOR2Wy-Vh6ovsNAe19AYdRWW5R197CEBg4YXMdRhoojG3OfeoERTE8H8kTcOEnxsr26KqxhiDwtrZYMyP9zRmSX0Zq4hUQY29x";

STATUS_OTHER 	= "other";

FRONT_USER_COMMON_CONDITIONS = {
	active			:	ACTIVE,
	user_role_id 	: 	FRONT_USER_ROLE_ID,
	is_deleted 		:	NOT_DELETED,
	is_verified 	: 	VERIFIED
};

COMPLETED 		= 	1;
NOT_COMPLETED	=	0;

/** Constant for latest causes limit on  */
LATEST_DASHBOARD_CAUSES_LIMIT =	3;


MAIL_SENT 		= 	1;
FORM_OPEN 		= 	2;
FORM_COMPLETE 	= 	3;

SUBSCRIBED		=	1;	


/*** Accounting World */
API_STATUS_SUCCESS = true;
API_STATUS_ERROR   = false;


/** JWT config */
JWT_CONFIG = {
    algorithm   : 'RS256',
    private_key : 'elearning123345learn6789live',
    expire_time : '24h'
}

API_URL		=	"/api/";
USER_VERIFICATION_TYPE_EMAIL    = 'email';
USER_VERIFICATION_TYPE_MOBILE   = 'phone';

QUESTION_TYPES = {};
MULTIPLE_CHOICE_QUESTION = 1;
INPUT_TYPE_QUESTION = 2;

MULTIPLE_CHOICE_QUESTION_NAME = "Multiple Choice Question";
INPUT_TYPE_QUESTION_NAME 	  = "Input Type Question";

QUESTION_TYPES[MULTIPLE_CHOICE_QUESTION] = MULTIPLE_CHOICE_QUESTION_NAME;
QUESTION_TYPES[INPUT_TYPE_QUESTION] 	 = INPUT_TYPE_QUESTION_NAME;
QUESTION_OPTION_NAME = ['A','B','C','D','E','F'];


EXAM_QUIZ_LIMIT	=	10;