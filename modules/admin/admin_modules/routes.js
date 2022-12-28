/** Model file path for current plugin **/
const modelPath 	= __dirname+"/model/admin_module";
const modulePath	= "/"+ADMIN_NAME+"/admin_modules/";
const adminModules	= require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
	req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used for list page **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	adminModules.list(req, res);
});

/** Routing is used add admin module **/
app.all(modulePath+"add",checkLoggedInAdmin,(req, res) => {
	adminModules.add(req, res);
});

/** Routing is used to edit admin module **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req, res) => {
	adminModules.edit(req, res);
});

/** Routing is used to update status**/
app.all(modulePath+"update-status/:id/:status",checkLoggedInAdmin,(req, res) => {
	adminModules.updateAdminModuleStatus(req, res);
});

/** Routing is used to delete **/
app.all(modulePath+"delete/:id",checkLoggedInAdmin,(req, res) => {
	adminModules.delete(req, res);
});

/** Routing is used to change order of module **/
app.all(modulePath+"change_order",checkLoggedInAdmin,(req, res) => {
	adminModules.changeOrderValue(req, res);
});
