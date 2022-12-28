/** Model file path for current plugin **/
const modelPath  				= 	__dirname+"/model/faq";
const modulePath				= 	"/"+ADMIN_NAME+"/faq/";
const adminFaq 					=	require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
   	req.rendering.views	=	__dirname + "/views";
    next();
});


/** Routing is used to get Faq list **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	adminFaq.getFaqList(req, res);
});

/** Routing is used to add or edit Faq **/
app.all([modulePath+"add",modulePath+"edit/:id"],checkLoggedInAdmin,(req, res, next) => {
	adminFaq.addEditFaq(req, res, next);
});

/** Routing is used to delete Faq details **/
app.get(modulePath+"delete/:id",checkLoggedInAdmin,(req, res, next) => {
	adminFaq.FaqDelete(req, res, next);
});
