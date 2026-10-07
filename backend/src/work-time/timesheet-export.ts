import { Workbook, Worksheet } from 'exceljs';
import { TimesheetService } from './timesheet.service';

const statuses:Record<string,string>={DRAFT:'Рабочий отчёт',REVIEWED:'Проверен',APPROVED:'Утверждён',CLOSED:'Закрыт'};
const duration=(ms:number|null)=>ms===null?'—':ms/86400000;
const instant=(value:string|Date|null)=>value?new Date(value).toISOString():'Не завершено';
function issues(row:any){return [row.issues.overlap?'Пересечение отметок':'',row.issues.unclosed?'Незакрытых интервалов: '+row.issues.unclosed:'',row.issues.pending?'Исправлений на проверке: '+row.issues.pending:'',row.issues.missing?'Дни по плану без отметок':'',row.issues.planUnavailable?'План недоступен':'',row.workflow?.stale?'После проверки данные изменились':''].filter(Boolean).join('; ');}
function table(book:Workbook,name:string,headers:string[],widths:number[],note:string){
  const sheet=book.addWorksheet(name,{views:[{state:'frozen',ySplit:3}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:3'}});
  sheet.columns=widths.map(width=>({width}));
  sheet.mergeCells(1,1,1,headers.length);sheet.getCell('A1').value=name;sheet.getCell('A1').font={name:'Calibri',size:16,bold:true,color:{argb:'FF4338CA'}};sheet.getRow(1).height=28;
  sheet.mergeCells(2,1,2,headers.length);sheet.getCell('A2').value=note;sheet.getCell('A2').alignment={wrapText:true,vertical:'middle'};sheet.getRow(2).height=48;
  sheet.addRow(headers);sheet.getRow(3).height=32;
  sheet.getRow(3).eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF4338CA'}};cell.alignment={wrapText:true,vertical:'middle'};});
  return sheet;
}
function add(sheet:Worksheet,values:(string|number)[],timeColumns:number[]=[]){
  // ExcelJS writes primitive strings as string cells, never formula/hyperlink objects.
  const row=sheet.addRow(values);row.height=32;
  row.eachCell(cell=>{cell.font={name:'Calibri',size:11};cell.alignment={vertical:'middle',wrapText:true};if(row.number%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF3F1FF'}};});
  for(const column of timeColumns)row.getCell(column).numFmt='[h]:mm:ss';
  return row;
}
export async function timesheetWorkbook(report:Awaited<ReturnType<TimesheetService['exportData']>>){
  const book=new Workbook();book.creator='SARKISIAN CRM';book.created=new Date(report.serverTime);
  const note=`Месяц: ${report.month}. Выгружено: ${instant(report.serverTime)}. Вся выбранная команда (${report.total}). Длительности — часы:минуты:секунды; «—» означает недостоверные или недоступные данные. Не расчёт зарплаты.`;
  const summary=table(book,'Табель',['Сотрудник','Отдел','Пояс отчёта','Состояние','Версия','План','Факт','Перерывы','Замечания','Данные на (UTC)'],[30,26,24,24,10,16,16,16,45,28],note);
  const daily=table(book,'По дням',['Сотрудник','Отдел','Дата','Пояс отчёта','План','Факт','Перерывы','Замечания'],[30,26,14,24,16,16,16,45],'Даты приведены в поясе табеля сотрудника. Ночные интервалы разделены между датами. Закрытый месяц выгружается по сохранённому снимку.');
  const intervals=table(book,'Интервалы',['Сотрудник','Отдел','Тип','Начало (UTC)','Конец (UTC)','Пояс отметки','ID рабочего интервала'],[30,26,18,28,28,24,40],'Полные границы исходных отметок в UTC, включая выход за месяц. Итоги на листах «Табель» и «По дням» учитывают только выбранный месяц. Открытые интервалы рассчитаны на дату снимка.');
  for(const row of report.items){
    const person=[row.employee.firstName,row.employee.lastName].filter(Boolean).join(' ')||'Сотрудник',department=row.employee.department?.name||'Без отдела';
    add(summary,[person,department,row.timezone,statuses[row.workflow.status]||row.workflow.status,row.workflow.edition,duration(row.plannedMs),duration(row.workedMs),duration(row.breakMs),issues(row),instant(row.serverTime||report.serverTime)],[6,7,8]);
    for(const day of row.days)add(daily,[person,department,day.date,row.timezone,duration(day.plannedMs),duration(day.workedMs),duration(day.breakMs),issues(day)],[5,6,7]);
    for(const interval of row.intervals||[]){
      add(intervals,[person,department,'Рабочий интервал',instant(interval.startedAt),instant(interval.endedAt),interval.timezone,interval.id]);
      for(const pause of interval.breaks)add(intervals,[person,department,'Перерыв',instant(pause.startedAt),instant(pause.endedAt),interval.timezone,interval.id]);
    }
  }
  for(const sheet of book.worksheets)sheet.autoFilter={from:{row:3,column:1},to:{row:Math.max(3,sheet.rowCount),column:sheet.columnCount}};
  const total=add(summary,['ИТОГО',`${report.total} сотрудников`,'','','',duration(report.summary.plannedMs),duration(report.summary.workedMs),duration(report.summary.breakMs),'',''],[6,7,8]);total.font={bold:true};
  return Buffer.from(await book.xlsx.writeBuffer());
}
