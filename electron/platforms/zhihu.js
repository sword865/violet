import marked from 'marked'
import request from '../request'
import PlatformHandler from './handler'
import {SUPPORT_PLATFORM_MAP} from '../const'

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false
})

function httpRequest({url, method = 'post', cookie, token, formData}) {
  if (!url) {
    return Promise.reject(new Error('Request url is empty'))
  }

  if (!cookie) {
    return Promise.reject(new Error(`Request header cookie is empty.\nURL is ${url}`))
  }

  if (!token) {
    return Promise.reject(new Error(`Request header token is empty and your cookie is ${cookie}`))
  }

  return request({
    url,
    method,
    formData,
    headers: {
      Accept: 'application/json',
      Cookie: cookie,
      [SUPPORT_PLATFORM_MAP.zhihu.csrfTokenName]: token,
      'Content-Type': 'application/json;charset=UTF-8'
    }
  })
}

/**
 * 更新文章（草稿状态，未发布）
 * 这个请求不用返回数据
 */
function updatePostContent({cookie, token, title, content, key}) {
  return httpRequest({
    cookie,
    token,
    method: 'patch',
    url: `https://zhuanlan.zhihu.com/api/drafts/${key}`,
    formData: {
      title, content
    }
  })
}

/**
 * 获取知乎草稿id
 */
function getZhihuDrafts({cookie, token, title, content}) {
  return httpRequest({
    url: 'https://zhuanlan.zhihu.com/api/drafts',
    formData : {
      topics: [],
      titleImage: '',
      column: '',
      isTitleImageFullScreen: false,
      content,
      title
    },
    method: 'post',
    cookie,
    token
  })
}

// http://tool.oschina.net/codeformat/json
// [{"followersCount": 37, "creator": {"bio": "\u770b\u4e09\u505a\u4e8c\u8bf4\u4e00 https://github.com/simongfxu", "hash": "75f1c2aa7927f7dbeb8d5cfe702fc92d", "description": "https://github.com/simongfxu", "profileUrl": "https://www.zhihu.com/people/reduxis", "avatar": {"id": "9a20d473d826eb58e1507da1bcc4027e", "template": "https://pic3.zhimg.com/{id}_{size}.jpg"}, "slug": "reduxis", "name": "\u9ad8\u51e1"}, "topics": [{"url": "https://www.zhihu.com/topic/19550516", "id": "19550516", "name": "Web \u5f00\u53d1"}, {"url": "https://www.zhihu.com/topic/20013159", "id": "20013159", "name": "React"}, {"url": "https://www.zhihu.com/topic/19552521", "id": "19552521", "name": "JavaScript"}], "activateState": "activated", "href": "/api/columns/reduixs", "acceptSubmission": true, "postTopics": [{"postsCount": 1, "id": 769, "name": "JavaScript"}, {"postsCount": 1, "id": 156416, "name": "React"}], "pendingName": "", "avatar": {"id": "f12f6dac2267cefdbabe1b16808c7694", "template": "https://pic1.zhimg.com/{id}_{size}.jpeg"}, "canManage": true, "description": "\u9ad8\u51e1@DataEye\uff0c\u5173\u6ce8Web\u524d\u7aef\u524d\u6cbf\u6280\u672f\u3002\nhttps://github.com/simongfxu", "pendingTopics": [], "nameCanEditUntil": 0, "reason": "\u8f6f\u4ef6\u5f00\u53d1-\u524d\u7aef\u6280\u672f", "banUntil": 0, "slug": "reduixs", "name": "\u300eReactive Now\u300f", "url": "/reduixs", "intro": "\u9ad8\u51e1@DataEye\uff0c\u5173\u6ce8Web\u524d\u7aef\u524d\u6cbf\u6280\u672f\u3002\n\u2026", "topicsCanEditUntil": 0, "activateAuthorRequested": "none", "commentPermission": "anyone", "following": false, "postsCount": 3, "canPost": true}]
function getZhihuColumns({cookie, token}) {
  return httpRequest({
    cookie,
    token,
    method: 'get',
    url: 'https://zhuanlan.zhihu.com/api/me/available_columns'
  })
}

export default class ZhihuHandler extends PlatformHandler {
  static alias = 'zhihu'

  whoAmI() {
    let {cookie, token} = this
    if (!cookie || !token) {
      return Promise.resolve(null)
    }

    return httpRequest({
      url: 'https://zhuanlan.zhihu.com/api/me',
      method: 'get',
      cookie,
      token
    })
  }

  /**
   * 一点小区别：
   * 编辑器中的换行会被知乎忽略，而GitHub不会
   * 我们这里不做任何处理
   */
  publish() {
    let {cookie, token, title, content, key} = this
    if (!cookie || !token || !title) {
      return Promise.resolve(null)
    }

    /**
     * 发布文章到各个写作平台
    知乎参考格式
    <b>加粗</b><p><i>斜体</i></p><p><u>下划线</u></p><h2>标题</h2>
    <blockquote>引用</blockquote><p></p>
    <ol><li><span style=\"line-height: 1.7;\">1</span><br></li>
    <li><span style=\"line-height: 1.7;\">2</span><br></li>
    <li><span style=\"line-height: 1.7;\">3</span><br></li>
    </ol><p></p>
    <ul><li><span style=\"line-height: 1.7;\">ol</span><br></li>
    <li><span style=\"line-height: 1.7;\">ol</span><br></li>
    <li><span style=\"line-height: 1.7;\">ol</span></li>
    </ul><br><p></p><br><p></p>
    <pre lang=\"\">var a = 1;\nfunction A() {\n    console.log(123)\n}\n</pre><p></p>
     */
    content = marked(content).trim()

    let task = key ?
      updatePostContent({cookie, token, title, content, key}) :
      getZhihuDrafts({cookie, token, title, content})

    return Promise.all([
      task,
      getZhihuColumns({cookie, token})
    ]).then(function([draftInfo, columnsInfo]) {
      let id = key || draftInfo.id
      let url = `https://zhuanlan.zhihu.com/api/drafts/${id}/publish`

      return httpRequest({
        url,
        method: 'put',
        cookie,
        token,
        formData: {
          author: columnsInfo[0].creator,
          canTitleImageFullScreen: false,
          column: columnsInfo[0],
          content,
          id,
          isTitleImageFullScreen: false,
          sourceUrl: '',
          state: 'published',
          title,
          titleImage: '',
          topics: columnsInfo[0].topics,
          updateTime: new Date().toISOString()
        }
      }).then(json => {
        return json.slug
      })
    })
  }
}

PlatformHandler.link(ZhihuHandler.alias, ZhihuHandler)
