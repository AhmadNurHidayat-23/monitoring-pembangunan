export type Category={id:number;name:string};
export type Project={id:number;code:string;name:string;category_id:number;category:string;location:string;budget:number;starts_on:string;target_on:string;phase:string;status:string;note:string;archived:number;percent:number|null;reported_on:string|null;late:boolean;lateDays:number};
export type Progress={id:number;project_id:number;on_date:string;percent:number;note:string;actor:string};
export type State={projects:Project[];categories:Category[];allProjects:{id:number;name:string}[];summary:{count:number;budget:number;late:number;reported:number};today:string};
export const phases=['Direncanakan','Berlangsung','Ditunda','Dibatalkan'];
