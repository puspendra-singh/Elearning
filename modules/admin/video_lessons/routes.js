/** Model file path for current plugin **/
const modelPath     = 	__dirname+"/model/video_lessons";
const modulePath	= 	"/"+ADMIN_NAME+"/video_lessons/";
const videoLessons =   require(modelPath);

/** Set current view folder **/
app.use(modulePath,(req, res, next) => {
    req.rendering.views	=	__dirname + "/views";
    next();
});

/** Routing is used to get video lesson list **/
app.all(modulePath,checkLoggedInAdmin,(req, res,next) => {
    videoLessons.getVideoLessonList(req, res,next);
});

/** Routing is used to add video lesson **/
app.all(modulePath+"add",checkLoggedInAdmin,(req,res,next) => {
    videoLessons.addVideoLesson(req,res,next);
});

/** Routing is used to edit video lesson **/
app.all(modulePath+"edit/:id",checkLoggedInAdmin,(req,res,next) => {
    videoLessons.editVideoLesson(req,res,next);
});