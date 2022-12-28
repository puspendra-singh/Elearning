/** Model file path for current plugin **/
var modelPath   =	__dirname+"/model/scheduled_newsletter";
var modulePath	= 	"/"+ADMIN_NAME+"/scheduled_newsletters/";

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
   	req.rendering.views	=	__dirname + "/views/scheduled_newsletter";
    next();
});

/** Routing is used to get scheduled newsletters list **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	var adminScheduledNewsletter = require(modelPath);
	adminScheduledNewsletter.scheduledNewsletter(req,res);
});

/** Routing is used to edit scheduled newsletters **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req, res,next) => {
	var adminScheduledNewsletter = require(modelPath);
	adminScheduledNewsletter.editScheduledNewsletter(req,res,next);
});

/** Routing is used to delete scheduled newsletters **/
app.all(modulePath+"delete/:id",checkLoggedInAdmin,(req, res,next) => {
	var adminScheduledNewsletter = require(modelPath);
	adminScheduledNewsletter.deleteScheduledNewsletter(req,res,next);
});
