import { QuestionResponse, EnglishLevel } from './types';

export const LOCAL_QUESTIONS: Record<string, Record<EnglishLevel, QuestionResponse[]>> = {
  business: {
    [EnglishLevel.INTERMEDIATE]: [
      { question: "Could you give us a brief update on the project status?", contextKr: "프로젝트 진행 상황에 대해 간략하게 말씀해 주시겠습니까?" },
      { question: "I think we should schedule a follow-up meeting next week. What do you think?", contextKr: "다음 주에 후속 회의를 잡는 게 좋을 것 같은데, 어떻게 생각하세요?" },
      { question: "Do you have the sales figures for this quarter ready?", contextKr: "이번 분기 매출 수치가 준비되었나요?" },
      { question: "Could you help me prepare the presentation slides for the client?", contextKr: "클라이언트를 위한 프레젠테이션 슬라이드 준비를 도와주실 수 있나요?" },
      { question: "I'm afraid I can't make the deadline. Can we extend it by two days?", contextKr: "마감일을 지키기 어려울 것 같습니다. 이틀만 연장할 수 있을까요?" },
      { question: "What are the main goals for our team this month?", contextKr: "이번 달 우리 팀의 주요 목표는 무엇인가요?" },
      { question: "Let me introduce our new marketing manager, Sarah.", contextKr: "새로 오신 마케팅 매니저 Sarah님을 소개해 드리겠습니다." },
      { question: "We need to cut costs for this project. Do you have any suggestions?", contextKr: "이 프로젝트의 비용을 절감해야 합니다. 제안할 사항이 있나요?" },
      { question: "Could you send me the meeting minutes via email?", contextKr: "회의록을 이메일로 보내주실 수 있나요?" },
      { question: "I'll be out of the office tomorrow for a workshop.", contextKr: "내일 워크샵 때문에 사무실에 없을 예정입니다." }
    ],
    [EnglishLevel.ADVANCED]: [
      { question: "Given the current market volatility, how should we adjust our Q4 strategy?", contextKr: "현재 시장 변동성을 고려할 때, 4분기 전략을 어떻게 수정해야 할까요?" },
      { question: "I have some concerns regarding the feasibility of the proposed timeline. Can we discuss potential risks?", contextKr: "제안된 일정의 실현 가능성에 대해 우려가 있습니다. 잠재적 리스크에 대해 논의할 수 있을까요?" },
      { question: "We need to align our stakeholders on the new compliance regulations before moving forward.", contextKr: "진행하기 전에 새로운 규정 준수 사항에 대해 이해관계자들의 의견을 일치시켜야 합니다." },
      { question: "What is your assessment of the competitive landscape for our new product launch?", contextKr: "신제품 출시에 대한 경쟁 구도를 어떻게 평가하시나요?" },
      { question: "I propose we pivot our approach to focus more on user retention rather than acquisition.", contextKr: "신규 유입보다는 사용자 유지에 더 집중하는 쪽으로 접근 방식을 전환할 것을 제안합니다." },
      { question: "The client is pushing back on the budget increase. How can we justify the additional costs?", contextKr: "클라이언트가 예산 증액에 반대하고 있습니다. 추가 비용을 어떻게 정당화할 수 있을까요?" },
      { question: "Let's leverage our core competencies to gain a strategic advantage in this niche market.", contextKr: "이 틈새시장에서 전략적 우위를 점하기 위해 우리의 핵심 역량을 활용합시다." },
      { question: "Could you elaborate on the ROI projections for this initiative?", contextKr: "이 계획에 대한 투자 수익률(ROI) 전망에 대해 자세히 설명해 주시겠습니까?" },
      { question: "We need to mitigate the supply chain disruptions affecting our production line.", contextKr: "생산 라인에 영향을 미치는 공급망 차질 문제를 완화해야 합니다." },
      { question: "I'd like to negotiate the terms of the contract specifically regarding intellectual property rights.", contextKr: "계약 조건 중 특히 지적 재산권과 관련된 부분을 협상하고 싶습니다." }
    ]
  },
  daily: {
    [EnglishLevel.INTERMEDIATE]: [
      { question: "Hi there! Is this seat taken?", contextKr: "안녕하세요! 여기 자리 있나요?" },
      { question: "The weather is amazing today, isn't it?", contextKr: "오늘 날씨가 정말 좋지 않나요?" },
      { question: "Could you recommend a good coffee shop nearby?", contextKr: "근처에 괜찮은 카페 하나 추천해 주실 수 있나요?" },
      { question: "What do you usually do on weekends?", contextKr: "주말에는 보통 무엇을 하시나요?" },
      { question: "I'm looking for the nearest subway station. Do you know where it is?", contextKr: "가장 가까운 지하철역을 찾고 있어요. 어디인지 아시나요?" },
      { question: "Have you seen the new Marvel movie yet?", contextKr: "새로 나온 마블 영화 보셨나요?" },
      { question: "I love your jacket! Where did you get it?", contextKr: "재킷이 정말 예쁘네요! 어디서 사셨어요?" },
      { question: "Do you have any plans for the holidays?", contextKr: "이번 연휴에 계획 있으신가요?" },
      { question: "I'm trying to learn how to cook Italian food.", contextKr: "이탈리아 요리를 배우려고 노력 중이에요." },
      { question: "It was nice talking to you. Have a great day!", contextKr: "대화 즐거웠습니다. 좋은 하루 보내세요!" }
    ],
    [EnglishLevel.ADVANCED]: [
      { question: "I've been really getting into mindfulness meditation lately. It helps me manage stress.", contextKr: "최근에 마음챙김 명상에 푹 빠졌어요. 스트레스 관리에 도움이 되더라고요." },
      { question: "What are your thoughts on the impact of social media on modern relationships?", contextKr: "소셜 미디어가 현대 인간관계에 미치는 영향에 대해 어떻게 생각하세요?" },
      { question: "If you could live anywhere in the world for a year, where would you go and why?", contextKr: "만약 1년 동안 세계 어디서든 살 수 있다면, 어디로 가고 싶으신가요? 그 이유는 무엇인가요?" },
      { question: "I find it fascinating how quickly technology is evolving. Does AI worry you at all?", contextKr: "기술이 이렇게 빨리 발전하는 게 정말 흥미로워요. AI에 대해 걱정되는 점은 없으신가요?" },
      { question: "Do you prefer a structured routine or do you like to go with the flow?", contextKr: "체계적인 일과를 선호하시나요, 아니면 흐름에 맡기는 편이신가요?" },
      { question: "I'm torn between buying a house now or waiting for the market to cool down.", contextKr: "집을 지금 살지, 아니면 시장이 좀 진정될 때까지 기다릴지 고민 중이에요." },
      { question: "Have you ever had a hobby that significantly changed your perspective on life?", contextKr: "삶을 바라보는 관점을 크게 바꿔놓은 취미가 있었나요?" },
      { question: "I believe that work-life balance is essential for long-term productivity.", contextKr: "일과 삶의 균형이 장기적인 생산성을 위해 필수적이라고 믿습니다." },
      { question: "How do you handle disagreements with friends who have opposing political views?", contextKr: "반대되는 정치적 견해를 가진 친구들과의 의견 충돌을 어떻게 다루시나요?" },
      { question: "The gentrification in this neighborhood has really changed its character over the years.", contextKr: "이 동네의 젠트리피케이션이 지난 몇 년간 동네의 성격을 정말 많이 바꿔놓았어요." }
    ]
  },
  travel: {
    [EnglishLevel.INTERMEDIATE]: [
      { question: "Excuse me, how do I get to the city center from here?", contextKr: "실례합니다, 여기서 시내 중심가로 가려면 어떻게 가야 하나요?" },
      { question: "I'd like to check in, please. Here is my passport.", contextKr: "체크인하고 싶습니다. 여기 제 여권이에요." },
      { question: "Is breakfast included in the room rate?", contextKr: "객실 요금에 조식이 포함되어 있나요?" },
      { question: "Could you take a picture of us, please?", contextKr: "저희 사진 좀 찍어주시겠어요?" },
      { question: "I think my luggage is lost. Where is the baggage claim office?", contextKr: "제 짐이 분실된 것 같아요. 수하물 분실 센터가 어디인가요?" },
      { question: "Do you have a map of the city tourist attractions?", contextKr: "도시 관광 명소 지도가 있나요?" },
      { question: "I'd like to order the local specialty dish.", contextKr: "이 지역 특산 요리를 주문하고 싶습니다." },
      { question: "What time does the last bus leave?", contextKr: "마지막 버스는 몇 시에 출발하나요?" },
      { question: "Can I change money here?", contextKr: "여기서 환전할 수 있나요?" },
      { question: "This is my first time visiting this country. It's beautiful.", contextKr: "이 나라 방문은 처음이에요. 정말 아름답네요." }
    ],
    [EnglishLevel.ADVANCED]: [
      { question: "I seem to have missed my connecting flight due to the delay. What are my options?", contextKr: "지연 때문에 연결편을 놓친 것 같습니다. 제가 선택할 수 있는 방안이 무엇인가요?" },
      { question: "Could you recommend some off-the-beaten-path destinations that aren't crowded with tourists?", contextKr: "관광객들로 붐비지 않는, 잘 알려지지 않은 여행지를 추천해 주실 수 있나요?" },
      { question: "I was charged for items from the mini-bar that I didn't use. Please remove them from the bill.", contextKr: "이용하지 않은 미니바 품목이 청구되었습니다. 계산서에서 제외해 주세요." },
      { question: "I'm interested in a guided tour that focuses on the historical architecture of the city.", contextKr: "이 도시의 역사적 건축물에 중점을 둔 가이드 투어에 관심이 있습니다." },
      { question: "Is there a way to upgrade to business class using my frequent flyer miles?", contextKr: "제 마일리지를 사용해서 비즈니스석으로 업그레이드할 수 있는 방법이 있나요?" },
      { question: "The customs officer asked me to declare any agricultural products. I'm not sure if packaged tea counts.", contextKr: "세관원이 농산물을 신고하라고 했습니다. 포장된 차도 해당되는지 잘 모르겠네요." },
      { question: "I'd like to rent a car, but I need comprehensive insurance coverage for peace of mind.", contextKr: "차를 렌트하고 싶은데, 안심할 수 있도록 종합 보험이 필요합니다." },
      { question: "Can you help me decipher this train schedule? It's a bit confusing.", contextKr: "이 기차 시간표 보는 것 좀 도와주시겠어요? 좀 헷갈리네요." },
      { question: "My reservation was for a room with a sea view, but this one faces the parking lot.", contextKr: "제 예약은 바다 전망 방이었는데, 이 방은 주차장 쪽이네요." },
      { question: "What are the cultural norms regarding tipping in this country?", contextKr: "이 나라의 팁 문화에 대한 관례는 어떤가요?" }
    ]
  },
  academic: {
    [EnglishLevel.INTERMEDIATE]: [
      { question: "I have a question about the assignment due next week.", contextKr: "다음 주 마감인 과제에 대해 질문이 있습니다." },
      { question: "Could you explain this theory in simpler terms?", contextKr: "이 이론을 좀 더 쉬운 용어로 설명해 주실 수 있나요?" },
      { question: "I'm looking for some resources for my research paper.", contextKr: "제 연구 논문을 위한 자료를 찾고 있습니다." },
      { question: "Are there any study groups I can join for this class?", contextKr: "이 수업을 위해 참여할 수 있는 스터디 그룹이 있나요?" },
      { question: "I didn't understand the last part of the lecture.", contextKr: "강의의 마지막 부분을 이해하지 못했어요." },
      { question: "What is the format of the final exam?", contextKr: "기말고사 형식은 어떻게 되나요?" },
      { question: "Can I get an extension on my essay?", contextKr: "에세이 제출 기한을 연장할 수 있을까요?" },
      { question: "I'm thinking of majoring in computer science.", contextKr: "컴퓨터 공학을 전공할까 생각 중입니다." },
      { question: "Where is the university library located?", contextKr: "대학 도서관은 어디에 있나요?" },
      { question: "Thank you for your feedback on my presentation.", contextKr: "제 프레젠테이션에 대한 피드백 감사합니다." }
    ],
    [EnglishLevel.ADVANCED]: [
      { question: "I'd like to discuss the methodology used in your recent publication.", contextKr: "교수님의 최근 출판물에 사용된 연구 방법론에 대해 논의하고 싶습니다." },
      { question: "The hypothesis presented in this paper contradicts established theories. What is your take?", contextKr: "이 논문에 제시된 가설은 기존 이론과 모순됩니다. 어떻게 생각하시나요?" },
      { question: "I'm struggling to synthesize the data from these two disparate sources.", contextKr: "이 두 가지 이질적인 출처의 데이터를 종합하는 데 어려움을 겪고 있습니다." },
      { question: "Could you critique the argument structure of my thesis proposal?", contextKr: "제 논문 제안서의 논증 구조를 비평해 주실 수 있나요?" },
      { question: "I'm interested in exploring the interdisciplinary applications of quantum computing.", contextKr: "양자 컴퓨팅의 학제간 응용 분야를 탐구하는 데 관심이 있습니다." },
      { question: "How do you ensure the ethical considerations are met in this psychological study?", contextKr: "이 심리학 연구에서 윤리적 고려 사항이 충족되도록 어떻게 보장하나요?" },
      { question: "The peer review process raised some valid points about sample size bias.", contextKr: "동료 검토 과정에서 표본 크기 편향에 대한 타당한 지적이 제기되었습니다." },
      { question: "I am considering applying for a grant to fund my fieldwork next semester.", contextKr: "다음 학기 현장 연구 자금을 지원받기 위해 보조금을 신청할까 고려 중입니다." },
      { question: "Let's analyze the correlation between socioeconomic status and educational outcomes.", contextKr: "사회경제적 지위와 교육 성과 사이의 상관관계를 분석해 봅시다." },
      { question: "I would appreciate your mentorship as I prepare for my dissertation defense.", contextKr: "학위 논문 심사를 준비하는 동안 멘토링을 부탁드리고 싶습니다." }
    ]
  },
  social: {
    [EnglishLevel.INTERMEDIATE]: [
      { question: "Hi, I'm Jin. Nice to meet you. What brings you here?", contextKr: "안녕하세요, 진입니다. 만나서 반가워요. 여기엔 어떤 일로 오셨나요?" },
      { question: "How do you know the host of the party?", contextKr: "이 파티 주최자와는 어떻게 아는 사이인가요?" },
      { question: "I really like the music they are playing.", contextKr: "지금 나오는 음악 정말 좋네요." },
      { question: "Have you tried the snacks? They are delicious.", contextKr: "간식 드셔보셨나요? 정말 맛있어요." },
      { question: "What kind of work do you do?", contextKr: "어떤 일을 하시나요?" },
      { question: "Are you from around here?", contextKr: "이 근처 사시나요?" },
      { question: "I'm a big fan of soccer. Do you watch any sports?", contextKr: "저는 축구를 정말 좋아해요. 스포츠 보는 거 있으신가요?" },
      { question: "This venue is really beautiful.", contextKr: "이 장소 정말 아름답네요." },
      { question: "I'm learning English these days. It's quite challenging.", contextKr: "요즘 영어를 배우고 있어요. 꽤 어렵네요." },
      { question: "Do you have an Instagram account?", contextKr: "인스타그램 계정 있으세요?" }
    ],
    [EnglishLevel.ADVANCED]: [
      { question: "It's quite refreshing to meet someone with such a unique perspective on the industry.", contextKr: "업계에 대해 그렇게 독특한 시각을 가진 분을 만나니 참 신선하네요." },
      { question: "I was just discussing the nuances of cross-cultural communication with Sarah.", contextKr: "방금 Sarah와 타문화 간 의사소통의 미묘한 차이에 대해 이야기하고 있었어요." },
      { question: "How do you typically spend your downtime when you're not working on high-stakes projects?", contextKr: "중요한 프로젝트를 하지 않을 때 여가 시간은 보통 어떻게 보내시나요?" },
      { question: "That's a fascinating anecdote. It reminds me of a similar experience I had in Europe.", contextKr: "정말 흥미로운 일화네요. 제가 유럽에서 겪었던 비슷한 경험이 생각나요." },
      { question: "Networking events can be a bit draining, don't you think?", contextKr: "네트워킹 행사는 좀 기이 빨리는 것 같지 않나요?" },
      { question: "I'm looking to expand my professional circle in the tech sector. Any advice?", contextKr: "기술 분야에서 제 인맥을 넓히고 싶은데, 조언해 주실 게 있나요?" },
      { question: "We should definitely grab coffee sometime and continue this discussion.", contextKr: "언제 커피 한잔하면서 이 이야기를 계속 나누면 좋겠네요." },
      { question: "What's your take on the recent trends in sustainable fashion?", contextKr: "최근 지속 가능한 패션 트렌드에 대해 어떻게 생각하시나요?" },
      { question: "I admire your dedication to volunteering. What motivated you to start?", contextKr: "봉사 활동에 대한 열정이 존경스럽습니다. 시작하게 된 계기가 무엇인가요?" },
      { question: "It's a small world! I can't believe we went to the same university.", contextKr: "정말 세상 좁네요! 우리가 같은 대학을 나왔다니 믿기지가 않아요." }
    ]
  },
  medical: {
    [EnglishLevel.INTERMEDIATE]: [
      { question: "I have a terrible headache and a sore throat.", contextKr: "머리가 너무 아프고 목도 아파요." },
      { question: "Do I need a prescription for this medicine?", contextKr: "이 약을 사려면 처방전이 필요한가요?" },
      { question: "How many times a day should I take this pill?", contextKr: "이 알약은 하루에 몇 번 먹어야 하나요?" },
      { question: "I'd like to make an appointment with Dr. Smith.", contextKr: "스미스 선생님과 진료 예약을 하고 싶습니다." },
      { question: "I think I ate something bad. My stomach hurts.", contextKr: "상한 걸 먹은 것 같아요. 배가 아파요." },
      { question: "Are there any side effects to this treatment?", contextKr: "이 치료법에 부작용이 있나요?" },
      { question: "I twisted my ankle while playing soccer.", contextKr: "축구를 하다가 발목을 삐었어요." },
      { question: "Can you give me something for a fever?", contextKr: "해열제 좀 주실 수 있나요?" },
      { question: "Is it possible to get a medical certificate?", contextKr: "진단서를 뗄 수 있을까요?" },
      { question: "I am allergic to peanuts.", contextKr: "저는 땅콩 알레르기가 있어요." }
    ],
    [EnglishLevel.ADVANCED]: [
      { question: "I've been experiencing persistent migraines accompanied by nausea for the past week.", contextKr: "지난 일주일 동안 메스꺼움을 동반한 편두통이 지속되고 있습니다." },
      { question: "Could you elaborate on the potential risks and benefits of this surgical procedure?", contextKr: "이 수술 절차의 잠재적 위험과 이점에 대해 자세히 설명해 주시겠습니까?" },
      { question: "I'm concerned that my current medication might be interacting negatively with my supplements.", contextKr: "현재 복용 중인 약이 제 영양제와 부정적인 상호작용을 일으키는 것 같아 걱정됩니다." },
      { question: "What are the lifestyle modifications you recommend to manage my cholesterol levels?", contextKr: "제 콜레스테롤 수치를 관리하기 위해 권장하시는 생활 습관 변화는 무엇인가요?" },
      { question: "I'd like a second opinion regarding the diagnosis of chronic fatigue syndrome.", contextKr: "만성 피로 증후군 진단에 대해 다른 의사의 소견을 듣고 싶습니다." },
      { question: "Is this condition hereditary? Should my children get tested as well?", contextKr: "이 질환은 유전인가요? 제 아이들도 검사를 받아봐야 할까요?" },
      { question: "The rehabilitation process seems quite intensive. What is the expected recovery timeline?", contextKr: "재활 과정이 꽤 강도가 높은 것 같네요. 예상 회복 기간은 어떻게 되나요?" },
      { question: "I'm experiencing some adverse reactions to the anesthesia from my last visit.", contextKr: "지난번 방문 때 마취에 대한 부작용을 겪고 있습니다." },
      { question: "Could you explain the discrepancy between these two lab results?", contextKr: "이 두 가지 검사 결과의 차이점에 대해 설명해 주시겠습니까?" },
      { question: "I want to discuss palliative care options for my elderly father.", contextKr: "제 노부모님을 위한 완화 치료 옵션에 대해 논의하고 싶습니다." }
    ]
  }
};