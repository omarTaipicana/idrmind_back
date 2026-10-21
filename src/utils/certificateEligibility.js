// Verificar la finalización y aprobación en el aula; un cupón solo sustituye el pago.
module.exports = async (user, course) => {
  const db = require('./connectionM');
  const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };
  let rows;
  try {
    [rows] = await db.query(`SELECT cc.timecompleted, gg.finalgrade, gi.gradepass
      FROM mdl_user u
      JOIN mdl_course c ON LOWER(c.shortname)=LOWER(:sigla)
      LEFT JOIN mdl_course_completions cc ON cc.userid=u.id AND cc.course=c.id
      LEFT JOIN mdl_grade_items gi ON gi.courseid=c.id AND gi.itemtype='course'
      LEFT JOIN mdl_grade_grades gg ON gg.itemid=gi.id AND gg.userid=u.id
      WHERE LOWER(u.email)=LOWER(:email) AND u.deleted=0 AND u.suspended=0`, { replacements: { sigla: course.sigla, email: user.email } });
  } catch (e) { fail('No se pudo verificar la aprobación en el aula virtual. Intenta nuevamente o contacta con administración.'); }
  if (rows.length !== 1 || !Number(rows[0].timecompleted)) fail('El aula virtual aún no registra el curso como completado.');
  if (Number(rows[0].gradepass) > 0 && (rows[0].finalgrade == null || Number(rows[0].finalgrade) < Number(rows[0].gradepass))) fail('Aún no se alcanza la calificación de aprobación configurada en el aula.');
};
