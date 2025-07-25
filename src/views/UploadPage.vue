<template>
  <el-form label-position="top" class="form-container">
    <!-- 性别选择 -->
    <el-form-item label="性别">
      <el-radio-group v-model="gender">
        <el-radio :value="0">女生</el-radio>
        <el-radio :value="1">男生</el-radio>
      </el-radio-group>
    </el-form-item>

    <p>{{ message }}</p>
    <!-- 文件上传 -->
    <el-form-item label="上传文件">
      <!-- 上传组件 -->
      <el-upload
        class="upload-demo"
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        :http-request="handleUpload"
        :on-change="handleFileChange"
        ref="uploadRef"
      >
        <el-button type="primary">选择文件</el-button>
      </el-upload>

      <!-- 上传按钮 -->
      <el-button
        v-if="selectedFile"
        type="success"
        :loading="uploadStatus === 'uploading'"
        @click="submitUpload"
        style="margin-left: 10px; width: 80px"
      >
        上传
      </el-button>
    </el-form-item>
    <el-form-item>
      <!-- 文件名显示 -->
      <div class="file-info">
        {{ selectedFile ? `已选择文件：${selectedFile.name}` : "未选择文件" }}
      </div>
    </el-form-item>
    <el-form-item>
      <!-- 状态提示信息 -->
      <div class="status-info">
        <template v-if="uploadStatus === 'idle'">&nbsp;&nbsp;</template>
        <template v-if="uploadStatus === 'uploading'">
          ⏳ 正在上传...
        </template>
        <template v-else-if="uploadStatus === 'done'"> ✅ 上传完成 </template>
        <template v-else-if="uploadStatus === 'error'">
          ❌ 上传失败，请重试
        </template>
      </div>
    </el-form-item>

    <!-- 对话区域 -->
    <el-form-item label="对话">
      <el-input
        type="textarea"
        v-model="dialogueMessage"
        :rows="6"
        placeholder="请输入对话内容"
      />
      <el-button class="send-btn" type="success" @click="handleSend"
        >发送</el-button
      >
    </el-form-item>
  </el-form>
</template>

<script setup>
import { start, stop, uploadToHuman } from "../medium/client";
import { baseurl } from "../medium/config";
import { useGlobalConfig } from "@/stores";
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";

const gender = ref(0); // v-model绑定用
const loading = ref(false);
const message = ref("选择人像照片");
const dialogueMessage = ref("");
const inputValue = ref("");
const fileInput = ref(null);

const selectedFile = ref(null);
const uploadStatus = ref("idle"); // 'idle' | 'uploading' | 'done' | 'error'
const uploadRef = ref(null);

const handleFileChange = (file) => {
  if (!file || uploadStatus.value === "done") return; // 如果上传成功后，不重复设置
  selectedFile.value = file.raw;
  uploadStatus.value = "idle";
};

const resetData = () => {
  selectedFile.value = null;
  setTimeout(() => {
    uploadStatus.value = "idle";
  }, 1000);
};

watch(selectedFile, (newVal, oldVal) => {
  console.log("selectedFile changed:", oldVal, "->", newVal);
});

const submitUpload = () => {
  uploadRef.value.submit();
};

const globalconfig = useGlobalConfig();

const send = () => {
  uploadToHuman(inputValue.value);
};

const handleUpload = async (uploadOption) => {
  const file = uploadOption.file;
  if (!file) {
    message.value = "请先选择文件";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", gender.value);

  loading.value = true;
  message.value = "上传中，请稍候...";

  try {
    uploadStatus.value = "uploading";
    const response = await fetch(`http://${baseurl}/create_human`, {
      method: "POST",
      body: formData,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // .then((res) => res.blob())
    // .then((blob) => createImageBitmap(blob))
    // .then((bitmap) => {
    //   globalconfig.depthPictureBitmap = bitmap;
    // });
    // const blob = await response.blob();
    // const imageBitmap = await createImageBitmap(blob);
    // globalconfig.depthPictureBitmap = imageBitmap;

    uploadStatus.value = "done";
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    } else {
      console.log("reponse ok");
    }

    message.value = "上传成功";
    ElMessage.success("上传成功");
    resetData();
  } catch (err) {
    uploadStatus.value = "error";
    message.value = "上传失败: " + err.message;
  } finally {
    loading.value = false;
  }
};

const handleSend = () => {};
</script>

<style>
.form-container {
  max-width: 520px;
  min-width: 200px;
  margin: 40px auto;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  font-size: 24px;
  line-height: 1.6;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.05);
}

.el-form-item__label {
  font-size: 20px;
}
.send-btn {
  margin-top: 10px;
}

.file-info {
  margin-top: 10px;
  color: #333;
}

.el-form-item__label {
  font-size: 16px;
}

/* 单选按钮文字 */
.el-radio {
  font-size: 16px;
}

/* 按钮文字 */
.el-button {
  font-size: 16px;
}

/* 输入框文本 */
.el-textarea__inner,
.el-input__inner {
  font-size: 16px;
}
</style>
