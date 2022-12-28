/** Model file path for current plugin **/
const modelPath     = 	__dirname+"/model/cms";
const modulePath	= 	"/"+ADMIN_NAME+"/cms/";
const adminCms      =   require(modelPath);


/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get cms list **/
app.all(modulePath,checkLoggedInAdmin,(req, res,next) => {
    adminCms.getCmsList(req, res,next);
});

/** Routing is used to add cms **/
app.all(modulePath+"add",checkLoggedInAdmin,(req,res,next) => {
    adminCms.addCms(req,res,next);
});

/** Routing is used to edit cms **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req,res,next) => {
    adminCms.editCms(req,res,next);
});
