/** Model file path for current plugin **/
var modelPath   =	__dirname+"/model/newsletter_template";
var modulePath	= 	"/"+ADMIN_NAME+"/newsletter_templates/";


/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
   	req.rendering.views	=	__dirname + "/views/newsletter_template";
    next();
});

/** Routing is used to get newsletter template list **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	var adminNewsletterTemplate = require(modelPath);
	adminNewsletterTemplate.getTemplateList(req, res);
});

/** Routing is used to add newsletter template **/
app.all(modulePath+"add",checkLoggedInAdmin,(req, res,next) => {
	var adminNewsletterTemplate = require(modelPath);
	adminNewsletterTemplate.addNewsletterTemplate(req,res,next);
});

/** Routing is used to edit newsletter template **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req, res,next) => {
	var adminNewsletterTemplate = require(modelPath);
	adminNewsletterTemplate.editNewsletterTemplate(req,res,next);
});

/** Routing is used to edit newsletter template **/
app.all(modulePath+"delete/:id",checkLoggedInAdmin,(req, res,next) => {
	var adminNewsletterTemplate = require(modelPath);
	adminNewsletterTemplate.deleteNewsletterTemplate(req,res,next);
});

/** Routing is used to send newsletter template list **/
app.all(modulePath+"send/:id",checkLoggedInAdmin,(req, res,next) => {
	var adminNewsletterTemplate = require(modelPath);
	adminNewsletterTemplate.sendNewsletterTemplate(req,res,next);
});
