/** Model file path for current plugin **/
const modelPath     = 	__dirname+"/model/past_papers";
const modulePath	= 	"/"+ADMIN_NAME+"/past_papers/";
const pastPapers    =   require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get past papers list **/
app.all(modulePath,checkLoggedInAdmin,(req, res,next) => {
    pastPapers.getPastPaperList(req, res,next);
});

/** Routing is used to add past paper **/
app.all(modulePath+"add",checkLoggedInAdmin,(req,res,next) => {
    pastPapers.addPastPaper(req,res,next);
});

/** Routing is used to edit past paper **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req,res,next) => {
    pastPapers.editPastPaper(req,res,next);
});