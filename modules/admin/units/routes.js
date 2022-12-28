/** Model file path for current plugin **/
const modelPath     = 	__dirname+"/model/units";
const modulePath	= 	"/"+ADMIN_NAME+"/units/";
const adminUnit      =   require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get units list **/
app.all(modulePath,checkLoggedInAdmin,(req, res,next) => {
    adminUnit.getUnitList(req, res,next);
});

/** Routing is used to add units **/
app.all(modulePath+"add",checkLoggedInAdmin,(req,res,next) => {
    adminUnit.addUnit(req,res,next);
});

/** Routing is used to edit unit **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req,res,next) => {
    adminUnit.editUnit(req,res,next);
});

/** Routing is used to get document of unit **/
app.all(modulePath+"documents/:id",checkLoggedInAdmin,(req,res,next) => {
    adminUnit.getUnitDocumentList(req,res,next);
});

/** Routing is used to add document of unit **/
app.all(modulePath+"document_add/:id",checkLoggedInAdmin,(req,res,next) => {
    adminUnit.addUnitDocument(req,res,next);
});

/** Routing is used to edit document of unit **/
app.all(modulePath+"document/edit/:id/:unit_id",checkLoggedInAdmin,(req,res,next) => {
    adminUnit.editUnitDocument(req,res,next);
});