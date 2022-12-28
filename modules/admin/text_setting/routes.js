/** Model file path for current plugin **/
const modelPath	        = __dirname+"/model/text_setting";
const modulePath	    = "/"+ADMIN_NAME+"/text-setting/";
const adminTextSetting  = require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get text setting list **/
app.all(modulePath+":type",checkLoggedInAdmin,(req, res)=>{
    adminTextSetting.getTextSettingList(req, res);
});

/** Routing is used to add text setting **/
app.all(modulePath+":type/add",checkLoggedInAdmin,(req, res)=>{
    adminTextSetting.addTextSetting(req, res);
});

/** Routing is used to edit text setting **/
app.all(modulePath+":type/edit/:id",checkLoggedInAdmin,(req, res)=>{
    adminTextSetting.editTextSetting(req, res);
});
