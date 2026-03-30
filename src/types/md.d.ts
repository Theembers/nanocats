// 声明 .md 文件模块类型
declare module "*.md" {
  const content: string;
  export default content;
}
