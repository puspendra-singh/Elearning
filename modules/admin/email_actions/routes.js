/** Model file path for current plugin **/
const modelPath  	= __dirname+"/model/email_action";
const modulePath	= "/"+ADMIN_NAME+"/email_actions/";
const emailActions 	= require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get email actions list **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	emailActions.list(req, res);
});

/** Routing is used to add email actions **/
app.all(modulePath+"add",checkLoggedInAdmin,(req, res,next) => {
	emailActions.add(req, res,next);
});

/** Routing is used to edit email actions **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req, res,next) => {
	emailActions.edit(req, res,next);
});

/** Routing is used to delete email actions **/
app.all(modulePath+"delete/:id",checkLoggedInAdmin,(req, res,next) => {
	emailActions.delete(req, res,next);
});

/** Routing is used to show hidden urls **/
app.get("/"+ADMIN_NAME+"/hidden_urls",checkLoggedInAdmin,(req, res) => {
	/** Set current view folder **/
    req.rendering.views	=	__dirname + "/views";
	res.render('hidden_urls');
});