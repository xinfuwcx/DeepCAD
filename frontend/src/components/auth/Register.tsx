import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Grid,
  Link,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  FormLabel,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Engineering as EngineeringIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useAlert } from '../common/AlertProvider';
import { validationRules, combineValidators } from '../../utils/errorHandler';

/**
 * 注册组件
 * 用于实现用户注册功能
 */
const Register: React.FC = () => {
  const navigate = useNavigate();
  
  // 步骤
  const steps = ['基本信息', '专业信息', '完成注册'];
  const [activeStep, setActiveStep] = useState<number>(0);
  
  // 状态
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 用户信息
  const [formData, setFormData] = useState({
    // 基本信息
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    name: '',
    // 专业信息
    company: '',
    jobTitle: '',
    professionalField: 'civil',
    experience: 'junior',
    // 其他
    agreeTerms: false,
    role: 'engineer' // 默认角色
  });
  
  // 密码可见性
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  // 表单错误
  const [formErrors, setFormErrors] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    name: '',
    agreeTerms: '',
    company: '',
    jobTitle: '',
    professionalField: '',
    experience: ''
  });
  
  // 认证上下文
  const { register } = useAuth();
  
  // 提示上下文
  const { showSuccess, showError } = useAlert();
  
  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value, checked, type } = e.target as HTMLInputElement;
    if (name) {
      // 对于checkbox类型，使用checked属性而不是value
      const newValue = type === 'checkbox' ? checked : value;
      setFormData(prev => ({ ...prev, [name]: newValue }));
      
      // 清除对应字段的错误
      if (formErrors[name]) {
        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
      
      // 如果修改了密码，同时验证确认密码
      if (name === 'password' && formData.confirmPassword) {
        validateField('confirmPassword', formData.confirmPassword);
      }
    }
  };
  
  // 处理密码可见性切换
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // 处理确认密码可见性切换
  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  // 验证单个字段
  const validateField = (name: string, value: any): boolean => {
    let error: string | undefined = '';
    
    switch (name) {
      case 'username':
        error = combineValidators(
          validationRules.required,
          validationRules.minLength(3),
          validationRules.maxLength(20)
        )(value);
        break;
      case 'email':
        error = combineValidators(
          validationRules.required,
          validationRules.email
        )(value);
        break;
      case 'password':
        error = combineValidators(
          validationRules.required,
          validationRules.password
        )(value);
        break;
      case 'confirmPassword':
        error = combineValidators(
          validationRules.required,
          validationRules.passwordMatch(formData.password)
        )(value);
        break;
      case 'name':
        error = combineValidators(
          validationRules.required,
          validationRules.minLength(2),
          validationRules.maxLength(50)
        )(value);
        break;
      case 'company':
        error = validationRules.maxLength(100)(value);
        break;
      case 'jobTitle':
        error = validationRules.maxLength(50)(value);
        break;
      case 'professionalField':
        error = validationRules.required(value);
        break;
      case 'experience':
        error = validationRules.required(value);
        break;
      case 'agreeTerms':
        error = value ? undefined : '您必须同意用户协议才能注册';
        break;
      default:
        break;
    }
    
    if (error) {
      setFormErrors(prev => ({ ...prev, [name]: error as string }));
      return false;
    }
    
    return true;
  };
  
  // 验证当前步骤
  const validateStep = () => {
    let isValid = true;
    
    if (activeStep === 0) {
      // 验证基本信息
      const fieldsToValidate = ['username', 'email', 'password', 'confirmPassword'];
      
      fieldsToValidate.forEach(field => {
        const fieldValue = formData[field as keyof typeof formData] as string;
        if (!validateField(field, fieldValue)) {
          isValid = false;
        }
      });
    } else if (activeStep === 1) {
      // 验证专业信息
      const fieldsToValidate = ['name', 'company', 'jobTitle', 'professionalField', 'experience'];
      
      fieldsToValidate.forEach(field => {
        const fieldValue = formData[field as keyof typeof formData] as string;
        if (!validateField(field, fieldValue)) {
          isValid = false;
        }
      });
    } else if (activeStep === 2) {
      // 验证协议同意
      if (!formData.agreeTerms) {
        setFormErrors(prev => ({ ...prev, agreeTerms: '您必须同意用户协议才能注册' }));
        isValid = false;
      }
    }
    
    return isValid;
  };
  
  // 处理下一步
  const handleNext = () => {
    if (validateStep()) {
      if (activeStep === steps.length - 1) {
        handleRegister();
      } else {
        setActiveStep((prevStep) => prevStep + 1);
      }
    }
  };
  
  // 处理上一步
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // 处理注册
  const handleRegister = async () => {
    if (!validateStep()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await register(formData);
      showSuccess('注册成功');
      navigate('/dashboard');
    } catch (err) {
      console.error('注册失败:', err);
      showError('注册失败: ' + (err instanceof Error ? err.message : '未知错误'));
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };
  
  // 渲染基本信息步骤
  const renderBasicInfoStep = () => {
    return (
      <>
        <Typography variant="h6" gutterBottom>
          基本信息
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="username"
              name="username"
              label="用户名"
              value={formData.username}
              onChange={handleChange}
              error={!!formErrors.username}
              helperText={formErrors.username}
              autoComplete="username"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="name"
              name="name"
              label="姓名"
              value={formData.name}
              onChange={handleChange}
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="email"
              name="email"
              label="邮箱"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
              autoComplete="email"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="password"
              name="password"
              label="密码"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              id="confirmPassword"
              name="confirmPassword"
              label="确认密码"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!formErrors.confirmPassword}
              helperText={formErrors.confirmPassword}
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleToggleConfirmPasswordVisibility}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
        </Grid>
      </>
    );
  };
  
  // 渲染专业信息步骤
  const renderProfessionalInfoStep = () => {
    return (
      <>
        <Typography variant="h6" gutterBottom>
          专业信息
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="company"
              name="company"
              label="公司/组织"
              value={formData.company}
              onChange={handleChange}
              error={!!formErrors.company}
              helperText={formErrors.company}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="jobTitle"
              name="jobTitle"
              label="职位"
              value={formData.jobTitle}
              onChange={handleChange}
              error={!!formErrors.jobTitle}
              helperText={formErrors.jobTitle}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">专业领域</FormLabel>
              <RadioGroup
                name="professionalField"
                value={formData.professionalField}
                onChange={handleChange}
              >
                <FormControlLabel value="civil" control={<Radio />} label="土木工程" />
                <FormControlLabel value="geotechnical" control={<Radio />} label="岩土工程" />
                <FormControlLabel value="structural" control={<Radio />} label="结构工程" />
                <FormControlLabel value="other" control={<Radio />} label="其他" />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">工作经验</FormLabel>
              <RadioGroup
                name="experience"
                value={formData.experience}
                onChange={handleChange}
              >
                <FormControlLabel value="junior" control={<Radio />} label="初级 (0-3年)" />
                <FormControlLabel value="intermediate" control={<Radio />} label="中级 (3-8年)" />
                <FormControlLabel value="senior" control={<Radio />} label="高级 (8年以上)" />
                <FormControlLabel value="student" control={<Radio />} label="学生" />
              </RadioGroup>
            </FormControl>
          </Grid>
        </Grid>
      </>
    );
  };
  
  // 渲染完成注册步骤
  const renderCompleteStep = () => {
    return (
      <>
        <Typography variant="h6" gutterBottom>
          完成注册
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="body1" gutterBottom>
              请确认您的注册信息:
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">用户名:</Typography>
                  <Typography variant="body2">{formData.username}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">姓名:</Typography>
                  <Typography variant="body2">{formData.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">邮箱:</Typography>
                  <Typography variant="body2">{formData.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">专业领域:</Typography>
                  <Typography variant="body2">
                    {formData.professionalField === 'civil' && '土木工程'}
                    {formData.professionalField === 'geotechnical' && '岩土工程'}
                    {formData.professionalField === 'structural' && '结构工程'}
                    {formData.professionalField === 'other' && '其他'}
                  </Typography>
                </Grid>
                {formData.company && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">公司/组织:</Typography>
                    <Typography variant="body2">{formData.company}</Typography>
                  </Grid>
                )}
                {formData.jobTitle && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">职位:</Typography>
                    <Typography variant="body2">{formData.jobTitle}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  color="primary"
                />
              }
              label="我已阅读并同意用户协议和隐私政策"
            />
            {formErrors.agreeTerms && (
              <Typography color="error" variant="caption">
                {formErrors.agreeTerms}
              </Typography>
            )}
          </Grid>
        </Grid>
      </>
    );
  };
  
  // 根据当前步骤渲染内容
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfoStep();
      case 1:
        return renderProfessionalInfoStep();
      case 2:
        return renderCompleteStep();
      default:
        return '未知步骤';
    }
  };
  
  return (
    <Container component="main" maxWidth="md">
      <Paper
        elevation={3}
        sx={{
          mt: 8,
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4
          }}
        >
          <EngineeringIcon sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
          <Typography component="h1" variant="h5">
            注册账户
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ width: '100%', mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box sx={{ width: '100%', mb: 2 }}>
          {getStepContent(activeStep)}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 3 }}>
          <Button
            variant="outlined"
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
          >
            上一步
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : activeStep === steps.length - 1 ? (
              '注册'
            ) : (
              '下一步'
            )}
          </Button>
        </Box>
        
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2">
            已有账号?{' '}
            <Link href="#" variant="body2" onClick={() => navigate('/login')}>
              登录
            </Link>
          </Typography>
        </Box>
      </Paper>
      
      <Box mt={5} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} 深基坑CAE系统
        </Typography>
      </Box>
    </Container>
  );
};

export default Register; 