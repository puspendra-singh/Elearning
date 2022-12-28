/** Model file path for current plugin **/
var modelPath   =	__dirname+"/model/newsletter_subscriber";
var modulePath	= 	"/"+ADMIN_NAME+"/newsletter_subscribers/";

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
   	req.rendering.views	=	__dirname + "/views/newsletter_subscriber";
    next();
});

/** Routing is used to get newsletter subscriber list **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	var adminNewsletterSubscriber = require(modelPath);
	adminNewsletterSubscriber.getSubscriberList(req, res);
});

/** Routing is used to add newsletter subscriber **/
app.all(modulePath+"add",checkLoggedInAdmin,(req, res,next) => {
	var adminNewsletterSubscriber = require(modelPath);
	adminNewsletterSubscriber.addSubscriber(req,res,next);
});

/** Routing is used to edit newsletter subscriber **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req, res,next) => {
	var adminNewsletterSubscriber = require(modelPath);
	adminNewsletterSubscriber.editSubscriber(req,res,next);
});

/** Routing is used to delete newsletter subscriber **/
app.all(modulePath+"delete/:id",checkLoggedInAdmin,(req, res,next) => {
	var adminNewsletterSubscriber = require(modelPath,next);
	adminNewsletterSubscriber.deleteSubscriber(req,res,next);
});

/** Routing is used to update newsletter subscriber status **/
app.all(modulePath+"update_subscriber_status/:id/:status",checkLoggedInAdmin,(req, res,next) => {
	var adminNewsletterSubscriber = require(modelPath);
	adminNewsletterSubscriber.updateSubscriberStatus(req,res,next);
});
