/** Model file path for current plugin **/
const modelPath  				= 	__dirname+"/model/contact_us";
const modulePath				= 	"/"+ADMIN_NAME+"/contact_us/";
const adminContactUs 					=	require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
   	req.rendering.views	=	__dirname + "/views";
    next();
});


/** Routing is used to get ContactUs list **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	adminContactUs.getContactUsList(req, res);
});

/** Routing is used to delete ContactUs details **/
app.get(modulePath+"delete/:id",checkLoggedInAdmin,(req, res, next) => {
	adminContactUs.ContactUsDelete(req, res, next);
});

/** Routing is used to view ContactUs details **/
app.get(modulePath+"view/:id",checkLoggedInAdmin,(req, res,next)=>{
    adminContactUs.getContactUsDetails(req, res,next);
});