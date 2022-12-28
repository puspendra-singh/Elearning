const { render } = require("ejs");

/** Model file path for current plugin **/
const modelPath     =	__dirname+"/model/home";
const home	        =   require(modelPath);
const modulePath	= 	"/";

/** Set current view folder **/
routes.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Set current view folder **/
routes.get("/",(req, res, next) => {
    home.getHomePageData(req,res,next,"home")
});

/** render on terms and conditions **/
routes.get(modulePath+"terms-conditions",(req, res, next) => {
    home.getHomePageData(req,res,next,"terms-conditions");
});

/** render on privacy-policy **/
routes.get(modulePath+"privacy-policy",async(req, res, next) => {
    home.getHomePageData(req,res,next,"privacy-policy");
});


/** Routing is used to get home data **/
routes.post(API_URL+"cms", userAuthorization, (req,res,next)=>{
    home.getCms(req,res,next);
});

/** Routing is used to get courses list **/
routes.get(API_URL+"courses", userAuthorization, (req,res,next)=>{
    home.getCoursesList(req,res,next);
});

/** Routing is used to post contact us detail **/
routes.post(API_URL+"contact_us", userAuthorization, (req,res,next)=>{
    home.contactUs(req,res,next);
});