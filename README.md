# 拼音反射训练

这是一个面向小学生的汉语拼音自动识别与拼读反射训练 H5 程序，可以通过 GitHub Pages 链接在手机微信里直接打开使用。

## 核心目标

把“思考拼读”压缩成“反射识别”：

- L0 感知层：声母、单韵母 0.5 秒识别
- L1 音节构建层：基础声母 + 单韵母整体拼读
- L2 扩展韵母层：复韵母、鼻韵母组合训练
- L3 完整音节层：普通音节、三拼音、整体认读
- L4 阅读反射层：拼音词块到语义单位

## 当前实现

- 0.5 秒闪卡窗口
- 反应时间记录
- 平均反应时间
- 拼音能力分 0-10
- 青铜到王者段位
- Mastery Matrix 掌握度模型
- 错误优先队列
- 自适应混合出题
- 本地浏览器保存训练数据

## 本机预览

```bash
python3 -m http.server 4173
```

打开：

```text
http://127.0.0.1:4173
```

## 手机微信使用

正式部署地址：

```text
https://stonelee3270-glitch.github.io/pinyin-practice/
```

把这个 HTTPS 链接发到微信，手机即可直接打开训练。

## 部署文件

- `index.html`
- `engine.css`
- `engine.js`
- `icon.svg`
- `manifest.webmanifest`
- `README.md`
