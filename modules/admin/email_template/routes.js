
/** Model file path for current plugin **/
const modelPath   			= __dirname+"/model/email_template";
const modulePath			= "/"+ADMIN_NAME+"/email_template/";
const adminEmailTemplate 	= require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
   	req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get email template list **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	adminEmailTemplate.getTemplateList(req, res);
});

/** Routing is used to edit email template **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req, res,next) => {
	adminEmailTemplate.editEmailTemplate(req,res,next);
});

/** Routing is used to add email template **/
app.all(modulePath+"add",checkLoggedInAdmin,(req, res,next) => {
	adminEmailTemplate.addEmailTemplate(req,res,next);
});

/** Routing is used to get email action options **/
app.post(modulePath+"get_action_options",checkLoggedInAdmin,(req, res,next) => {
	adminEmailTemplate.getEmailActionOptions(req,res,next);
});
