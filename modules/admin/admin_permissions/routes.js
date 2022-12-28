/** Model file path for current plugin **/
const modelPath			= __dirname+"/model/admin_permissions";
const modulePath		= "/"+ADMIN_NAME+"/admin_permissions/";
const adminPermissions	= require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
	req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used for listing page **/
app.all(modulePath,checkLoggedInAdmin,(req, res) => {
	adminPermissions.list(req, res);
});

/** Routing is used to add permission **/
app.all(modulePath+"add",checkLoggedInAdmin,(req, res) => {
	adminPermissions.add(req, res);
});

/** Routing is used to edit permission **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req, res) => {
	adminPermissions.edit(req, res);
});

/** Routing is used to delete permission **/
app.all(modulePath+"delete/:id",checkLoggedInAdmin,(req, res) => {
	adminPermissions.delete(req, res);
});

/** Routing is used to view permission **/
app.get(modulePath+"view/:id",checkLoggedInAdmin,(req, res)=>{
    adminPermissions.viewDetials(req, res);
});

/** Routing is used to get allowed modules of a role **/
app.post(modulePath+"get_role_modules",checkLoggedInAdmin,(req, res)=>{
    adminPermissions.getAdminRoleModulesData(req, res);
});

/** Routing is used to update status**/
app.all(modulePath+"update-status/:id/:status",checkLoggedInAdmin,(req, res) => {
	adminPermissions.updateStatus(req, res);
});

/** Routing is used to send login credentials **/
app.get(modulePath+"send_login_credentials/:id",checkLoggedInAdmin,(req, res)=>{
    adminPermissions.sendLoginCredentials(req, res);
});