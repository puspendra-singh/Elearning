/** Model file path for current plugin **/
const modelPath 	= __dirname+"/model/setting";
const modulePath	= "/"+ADMIN_NAME+"/settings/";
const adminSettings = require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get setting list **/
app.all(modulePath,checkLoggedInAdmin,function(req, res) {
    adminSettings.getSettingList(req, res);
});

/** Routing is used to add setting **/
app.all(modulePath+"add",checkLoggedInAdmin,(req, res) => {
	adminSettings.addSetting(req, res);
});

/** Routing is used to delete setting **/
app.all(modulePath+"delete/:id",checkLoggedInAdmin,(req, res) => {
	adminSettings.deleteSetting(req, res);
});

/** Routing is used to edit setting **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,function(req, res) {
    adminSettings.editSetting(req, res);
});

/** Routing is used to get setting listing with edit page **/
app.all(modulePath+"prefix/:type",checkLoggedInAdmin,function(req, res) {
    adminSettings.prefix(req, res);
});
