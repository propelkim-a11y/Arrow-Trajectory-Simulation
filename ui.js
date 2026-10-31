const INPUT_IDS = [
  'weight', 'diameter', 'dragCoeff', 'liftCoeff',
  'angle', 'velocity', 'yawAngle', 'launchHeight', 'launchZ',
  'windX', 'windY', 'targetDistance', 'targetHeight', 'airDensity',
  'losTargetY', 'losTargetZ' // 💡 LOS 수동 입력 ID 추가 (useLos는 체크박스이므로 별도 처리하거나 제외)
];

// 사용자가 제공할 활터 GPS 자료를 이 목록에 추가합니다.
// 형식: { id: 'unique-id', name: '활터명', latitude: 0, longitude: 0, elevation: 0 }
const ARCHERY_RANGES = [
  { id: '서울-공항정', name: '서울 공항정', latitude: 37.552797, longitude: 126.843864 },
  { id: '서울-관악정', name: '서울 관악정', latitude: 37.4585, longitude: 126.933775 },
  { id: '서울-살곶이정', name: '서울 살곶이정', latitude: 37.558547, longitude: 127.070153 },
  { id: '서울-석호정', name: '서울 석호정', latitude: 37.554789, longitude: 126.999933 },
  { id: '서울-수락정', name: '서울 수락정', latitude: 37.679725, longitude: 127.089903 },
  { id: '서울-영학정', name: '서울 영학정', latitude: 37.526819, longitude: 126.879711 },
  { id: '서울-황학정', name: '서울 황학정', latitude: 37.577536, longitude: 126.964114 },
  { id: '부산-구덕정', name: '부산 구덕정', latitude: 35.122511, longitude: 129.014242 },
  { id: '부산-낙동정', name: '부산 낙동정', latitude: 35.176375, longitude: 128.972739 },
  { id: '부산-사직정', name: '부산 사직정', latitude: 35.191347, longitude: 129.056517 },
  { id: '부산-수영정', name: '부산 수영정', latitude: 35.155228, longitude: 129.107122 },
  { id: 'daejeon-damdeokjeong', name: '대전 담덕정', latitude: 36.41787, longitude: 127.35729 },
  { id: 'daejeon-daedeokjeong', name: '대전 대덕정', latitude: 36.337739, longitude: 127.362572 },
  { id: 'daejeon-daedongjeong', name: '대전 대동정', latitude: 36.340553, longitude: 127.495767 },
  { id: 'daejeon-mudeokjeong', name: '대전 무덕정', latitude: 36.352844, longitude: 127.307219 },
  { id: 'daejeon-bomunjeong', name: '대전 보문정', latitude: 36.283675, longitude: 127.384794 },
  { id: 'daejeon-jumongjeong', name: '대전 주몽정', latitude: 36.4335, longitude: 127.31192 },
  { id: 'daejeon-hoedeokjeong', name: '대전 회덕정', latitude: 36.425686, longitude: 127.415375 },
  { id: '대구-관덕정', name: '대구 관덕정', latitude: 35.828039, longitude: 128.563075 },
  { id: '대구-팔공정', name: '대구 팔공정', latitude: 35.848347, longitude: 128.6292 },
  { id: '인천-강화정', name: '인천 강화정', latitude: 37.744558, longitude: 126.522872 },
  { id: '인천-구월정', name: '인천 구월정', latitude: 37.428775, longitude: 126.707367 },
  { id: '인천-남수정', name: '인천 남수정', latitude: 37.456039, longitude: 126.773922 },
  { id: '인천-남호정', name: '인천 남호정', latitude: 37.414125, longitude: 126.724167 },
  { id: '인천-무덕정', name: '인천 무덕정', latitude: 37.459644, longitude: 126.661931 },
  { id: '인천-서무정', name: '인천 서무정', latitude: 37.560197, longitude: 126.679728 },
  { id: '인천-승기정', name: '인천 승기정', latitude: 37.394461, longitude: 126.66595 },
  { id: '인천-연무정', name: '인천 연무정', latitude: 37.541361, longitude: 126.715525 },
  { id: '인천-연수정', name: '인천 연수정', latitude: 37.408494, longitude: 126.685689 },
  { id: '인천-청룡정', name: '인천 청룡정', latitude: 37.56503, longitude: 126.72029 },
  { id: '인천-현무정', name: '인천 현무정', latitude: 37.607628, longitude: 126.660594 },
  { id: '광주-관덕정', name: '광주 관덕정', latitude: 35.143014, longitude: 126.910236 },
  { id: '광주-무등정', name: '광주 무등정', latitude: 35.184458, longitude: 126.881989 },
  { id: '광주-송무정', name: '광주 송무정', latitude: 35.150311, longitude: 126.801558 },
  { id: '광주-용진정', name: '광주 용진정', latitude: 35.197761, longitude: 126.730569 },
  { id: '울산-고헌정', name: '울산 고헌정', latitude: 35.543436, longitude: 129.185758 },
  { id: '울산-공원정', name: '울산 공원정', latitude: 35.521603, longitude: 129.3009 },
  { id: '울산-무룡정', name: '울산 무룡정', latitude: 35.607225, longitude: 129.361064 },
  { id: '울산-원학정', name: '울산 원학정', latitude: 35.578739, longitude: 129.303314 },
  { id: '울산-청학정', name: '울산 청학정', latitude: 35.49105, longitude: 129.41575 },
  { id: '세종-고려정', name: '세종 고려정', latitude: 36.723336, longitude: 127.150581 },
  { id: '세종-관운정', name: '세종 관운정', latitude: 36.697569, longitude: 127.201911 },
  { id: '세종-금덕정', name: '세종 금덕정', latitude: 36.4591, longitude: 127.276114 },
  { id: '세종-동운정', name: '세종 동운정', latitude: 36.663342, longitude: 127.240044 },
  { id: '가평-보납정', name: '가평 보납정', latitude: 37.824978, longitude: 127.502944 },
  { id: '고양-덕양정', name: '고양 덕양정', latitude: 37.615794, longitude: 126.826153 },
  { id: '고양-비호정', name: '고양 비호정', latitude: 37.663375, longitude: 126.832708 },
  { id: '고양-송학정', name: '고양 송학정', latitude: 37.724719, longitude: 126.834919 },
  { id: '고양-송호정', name: '고양 송호정', latitude: 37.693217, longitude: 126.749503 },
  { id: '과천-율목정', name: '과천 율목정', latitude: 37.451219, longitude: 127.004119 },
  { id: '광명-운학정', name: '광명 운학정', latitude: 37.461044, longitude: 126.861419 },
  { id: '구리-온달정', name: '구리 온달정', latitude: 37.585086, longitude: 127.126972 },
  { id: '군포-수리정', name: '군포 수리정', latitude: 37.344664, longitude: 126.904258 },
  { id: '김포-금능정', name: '김포 금능정', latitude: 37.637503, longitude: 126.705814 },
  { id: '김포-대호정', name: '김포 대호정', latitude: 37.638486, longitude: 126.595236 },
  { id: '김포-태산정', name: '김포 태산정', latitude: 37.724044, longitude: 126.630642 },
  { id: '남양주-무림정', name: '남양주 무림정', latitude: 37.698769, longitude: 127.165469 },
  { id: '남양주-천마정', name: '남양주 천마정', latitude: 37.647811, longitude: 127.129578 },
  { id: '동두천-동호정', name: '동두천 동호정', latitude: 37.936842, longitude: 127.058086 },
  { id: '부천-부천정', name: '부천 부천정', latitude: 37.500831, longitude: 126.797886 },
  { id: '부천-성무정', name: '부천 성무정', latitude: 37.478814, longitude: 126.78505 },
  { id: '성남-분당정', name: '성남 분당정', latitude: 37.383647, longitude: 127.154694 },
  { id: '수원-연무정', name: '수원 연무정', latitude: 37.288356, longitude: 127.024003 },
  { id: '시흥-소래정', name: '시흥 소래정', latitude: 37.421942, longitude: 126.767717 },
  { id: '시흥-시흥정', name: '시흥 시흥정', latitude: 37.352467, longitude: 126.709789 },
  { id: '시흥-중앙정', name: '시흥 중앙정', latitude: 37.375742, longitude: 126.801931 },
  { id: '시흥-양지정', name: '시흥 양지정', latitude: 37.434958, longitude: 126.817375 },
  { id: '안산-광덕정', name: '안산 광덕정', latitude: 37.318883, longitude: 126.806175 },
  { id: '안산-반월정', name: '안산 반월정', latitude: 37.290494, longitude: 126.873367 },
  { id: '안성-금광정', name: '안성 금광정', latitude: 36.999725, longitude: 127.306206 },
  { id: '안성-마춤정', name: '안성 마춤정', latitude: 37.095506, longitude: 127.201392 },
  { id: '안성-비봉정', name: '안성 비봉정', latitude: 37.095567, longitude: 127.201364 },
  { id: '안양-안양정', name: '안양 안양정', latitude: 37.378636, longitude: 126.964475 },
  { id: '양주-무호정', name: '양주 무호정', latitude: 37.879497, longitude: 126.975486 },
  { id: '양평-양강정', name: '양평 양강정', latitude: 37.485078, longitude: 127.487506 },
  { id: '양평-양평정', name: '양평 양평정', latitude: 37.433739, longitude: 127.533167 },
  { id: '여주-가야정', name: '여주 가야정', latitude: 37.273378, longitude: 127.705131 },
  { id: '여주-금당정', name: '여주 금당정', latitude: 37.337475, longitude: 127.677589 },
  { id: '여주-대룡정', name: '여주 대룡정', latitude: 37.374558, longitude: 127.580342 },
  { id: '여주-대명정', name: '여주 대명정', latitude: 37.202708, longitude: 127.534728 },
  { id: '여주-오갑정', name: '여주 오갑정', latitude: 37.199461, longitude: 127.690956 },
  { id: '여주-천양정', name: '여주 천양정', latitude: 37.388908, longitude: 127.532675 },
  { id: '여주-청심정', name: '여주 청심정', latitude: 37.293144, longitude: 127.625653 },
  { id: '여주-흥인정', name: '여주 흥인정', latitude: 37.355672, longitude: 127.540689 },
  { id: '연천-고대정', name: '연천 고대정', latitude: 38.185853, longitude: 127.103431 },
  { id: '연천-학소정', name: '연천 학소정', latitude: 38.022178, longitude: 127.061608 },
  { id: '오산-세마정', name: '오산 세마정', latitude: 37.165136, longitude: 127.041169 },
  { id: '용인-수양정', name: '용인 수양정', latitude: 37.171319, longitude: 127.374781 },
  { id: '용인-용무정', name: '용인 용무정', latitude: 37.248822, longitude: 127.204075 },
  { id: '의왕-의왕정', name: '의왕 의왕정', latitude: 37.343022, longitude: 126.992958 },
  { id: '의정부-용현정', name: '의정부 용현정', latitude: 37.734514, longitude: 127.073894 },
  { id: '이천-설봉정', name: '이천 설봉정', latitude: 37.280036, longitude: 127.427708 },
  { id: '파주-감악정', name: '파주 감악정', latitude: 37.948842, longitude: 126.932225 },
  { id: '파주-광무정', name: '파주 광무정', latitude: 37.754753, longitude: 126.859556 },
  { id: '파주-교하정', name: '파주 교하정', latitude: 37.7619, longitude: 126.742881 },
  { id: '파주-금호정', name: '파주 금호정', latitude: 37.756828, longitude: 126.7881 },
  { id: '파주-선무정', name: '파주 선무정', latitude: 37.713072, longitude: 126.697928 },
  { id: '파주-임월정', name: '파주 임월정', latitude: 37.878936, longitude: 126.784828 },
  { id: '파주-탄현정', name: '파주 탄현정', latitude: 37.803653, longitude: 126.698178 },
  { id: '파주-화석정', name: '파주 화석정', latitude: 37.934056, longitude: 126.837494 },
  { id: '평택-송무정', name: '평택 송무정', latitude: 37.073511, longitude: 127.062672 },
  { id: '평택-평택정', name: '평택 평택정', latitude: 36.992178, longitude: 126.918372 },
  { id: '평택-화궁정', name: '평택 화궁정', latitude: 36.994481, longitude: 127.06435 },
  { id: '포천-대군정', name: '포천 대군정', latitude: 37.961164, longitude: 127.126308 },
  { id: '포천-동부정', name: '포천 동부정', latitude: 37.93925, longitude: 127.262422 },
  { id: '포천-용호정', name: '포천 용호정', latitude: 37.957158, longitude: 127.168583 },
  { id: '포천-포천정', name: '포천 포천정', latitude: 37.943575, longitude: 127.177881 },
  { id: '화성-남양정', name: '화성 남양정', latitude: 37.194703, longitude: 126.79765 },
  { id: '화성-동탄정', name: '화성 동탄정', latitude: 37.172056, longitude: 127.095067 },
  { id: '화성-마도정', name: '화성 마도정', latitude: 37.170894, longitude: 126.785725 },
  { id: '화성-비봉정', name: '화성 비봉정', latitude: 37.259272, longitude: 126.849472 },
  { id: '화성-송산정', name: '화성 송산정', latitude: 37.242858, longitude: 126.670633 },
  { id: '화성-쌍봉정', name: '화성 쌍봉정', latitude: 37.090192, longitude: 126.81615 },
  { id: '화성-정남정', name: '화성 정남정', latitude: 37.167556, longitude: 126.9942 },
  { id: '화성-팔탄정', name: '화성 팔탄정', latitude: 37.152486, longitude: 126.90335 },
  { id: '화성-화산정', name: '화성 화산정', latitude: 37.220311, longitude: 127.02175 },
  { id: '화성-화성정', name: '화성 화성정', latitude: 37.139103, longitude: 126.929044 },
  { id: '강릉-경포정', name: '강릉 경포정', latitude: 37.802456, longitude: 128.860467 },
  { id: '강릉-율곡정', name: '강릉 율곡정', latitude: 37.873844, longitude: 128.837 },
  { id: '고성-수성정', name: '고성 수성정', latitude: 38.374614, longitude: 128.461878 },
  { id: '동해-동덕정', name: '동해 동덕정', latitude: 37.517478, longitude: 129.101864 },
  { id: '동해-두타정', name: '동해 두타정', latitude: 37.479594, longitude: 129.061019 },
  { id: '동해-초록정', name: '동해 초록정', latitude: 37.48375, longitude: 129.116686 },
  { id: '삼척-죽서정', name: '삼척 죽서정', latitude: 37.412464, longitude: 129.167942 },
  { id: '삼척-해망정', name: '삼척 해망정', latitude: 37.172608, longitude: 129.335722 },
  { id: '속초-설악정', name: '속초 설악정', latitude: 38.194303, longitude: 128.536736 },
  { id: '양구-양록정', name: '양구 양록정', latitude: 38.113694, longitude: 127.981694 },
  { id: '양구-해안정', name: '양구 해안정', latitude: 38.286492, longitude: 128.149289 },
  { id: '양양-현산정', name: '양양 현산정', latitude: 38.077008, longitude: 128.614378 },
  { id: '영월-금호정', name: '영월 금호정', latitude: 37.199917, longitude: 128.473322 },
  { id: '원주-학봉정', name: '원주 학봉정', latitude: 37.337122, longitude: 127.945917 },
  { id: '인제-하늘내린정', name: '인제 하늘내린정', latitude: 38.122478, longitude: 128.194825 },
  { id: '정선-미석정', name: '정선 미석정', latitude: 37.224756, longitude: 128.672111 },
  { id: '정선-백운정', name: '정선 백운정', latitude: 37.217794, longitude: 128.835553 },
  { id: '정선-아라리정', name: '정선 아라리정', latitude: 37.374303, longitude: 128.676806 },
  { id: '정선-장찬정', name: '정선 장찬정', latitude: 37.491192, longitude: 128.863786 },
  { id: '철원-금학정', name: '철원 금학정', latitude: 38.201917, longitude: 127.209236 },
  { id: '춘천-호반정', name: '춘천 호반정', latitude: 37.854881, longitude: 127.694292 },
  { id: '태백-연무정', name: '태백 연무정', latitude: 37.152506, longitude: 128.9918 },
  { id: '평창-대관정', name: '평창 대관정', latitude: 37.687983, longitude: 128.700089 },
  { id: '평창-무겸정', name: '평창 무겸정', latitude: 37.619989, longitude: 128.387217 },
  { id: '평창-방림정', name: '평창 방림정', latitude: 37.425939, longitude: 128.413247 },
  { id: '평창-오대정', name: '평창 오대정', latitude: 37.643372, longitude: 128.544092 },
  { id: '평창-용평정', name: '평창 용평정', latitude: 37.606131, longitude: 128.426433 },
  { id: '평창-청옥정', name: '평창 청옥정', latitude: 37.344136, longitude: 128.493322 },
  { id: '평창-평창정', name: '평창 평창정', latitude: 37.371653, longitude: 128.399339 },
  { id: '평창-태화정', name: '평창 태화정', latitude: 37.502028, longitude: 128.459883 },
  { id: '홍천-석화정', name: '홍천 석화정', latitude: 37.714039, longitude: 127.905217 },
  { id: '화천-화림정', name: '화천 화림정', latitude: 38.094136, longitude: 127.699483 },
  { id: '황성-청태정', name: '황성 청태정', latitude: 37.522864, longitude: 128.210083 },
  { id: '황성-태풍정', name: '황성 태풍정', latitude: 37.500558, longitude: 127.962414 },
  { id: '괴산-사호정', name: '괴산 사호정', latitude: 36.812172, longitude: 127.78465 },
  { id: '단양-대성정', name: '단양 대성정', latitude: 36.980969, longitude: 128.355097 },
  { id: '보은-동학정', name: '보은 동학정', latitude: 36.516089, longitude: 127.7595 },
  { id: '영동-영무정', name: '영동 영무정', latitude: 36.1664, longitude: 127.782081 },
  { id: '옥천-관성정', name: '옥천 관성정', latitude: 36.3008, longitude: 127.545003 },
  { id: '옥천-청산정', name: '옥천 청산정', latitude: 36.337053, longitude: 127.767042 },
  { id: '음성-가섭정', name: '음성 가섭정', latitude: 36.966028, longitude: 127.678269 },
  { id: '제천-옥순정', name: '제천 옥순정', latitude: 36.933006, longitude: 128.204925 },
  { id: '제천-의림정', name: '제천 의림정', latitude: 37.179503, longitude: 128.205089 },
  { id: '제천-청풍명월정', name: '제천 청풍명월정', latitude: 36.976203, longitude: 128.120214 },
  { id: '증평-삼보정', name: '증평 삼보정', latitude: 36.782217, longitude: 127.567156 },
  { id: '진천-법화정', name: '진천 법화정', latitude: 36.895089, longitude: 127.541697 },
  { id: '진천-화랑정', name: '진천 화랑정', latitude: 36.841261, longitude: 127.377422 },
  { id: '청주-약수정', name: '청주 약수정', latitude: 36.695511, longitude: 127.558497 },
  { id: '청주-우암정', name: '청주 우암정', latitude: 36.644092, longitude: 127.496089 },
  { id: '청주-직지정', name: '청주 직지정', latitude: 36.576728, longitude: 127.519231 },
  { id: '청주-충현정', name: '청주 충현정', latitude: 36.585281, longitude: 127.577536 },
  { id: '충주-탄금정', name: '충주 탄금정', latitude: 36.988231, longitude: 127.897775 },
  { id: '고창-모양정', name: '고창 모양정', latitude: 35.433253, longitude: 126.725839 },
  { id: '고창-선운정', name: '고창 선운정', latitude: 35.462297, longitude: 126.722481 },
  { id: '고창-장사정', name: '고창 장사정', latitude: 35.441078, longitude: 126.482567 },
  { id: '고창-초파정', name: '고창 초파정', latitude: 35.464617, longitude: 126.545469 },
  { id: '군산-진남정', name: '군산 진남정', latitude: 35.968544, longitude: 126.794711 },
  { id: '김제-금만정', name: '김제 금만정', latitude: 35.815861, longitude: 126.901839 },
  { id: '김제-홍심정', name: '김제 홍심정', latitude: 35.802414, longitude: 126.87805 },
  { id: '남원-관덕정', name: '남원 관덕정', latitude: 35.405847, longitude: 127.390783 },
  { id: '남원-황산정', name: '남원 황산정', latitude: 35.457958, longitude: 127.572572 },
  { id: '부안-심고정', name: '부안 심고정', latitude: 35.699469, longitude: 126.718575 },
  { id: '순창-육일정', name: '순창 육일정', latitude: 35.375358, longitude: 127.151233 },
  { id: '익산-건덕정', name: '익산 건덕정', latitude: 35.987883, longitude: 126.955794 },
  { id: '익산-송백정', name: '익산 송백정', latitude: 35.962142, longitude: 126.942103 },
  { id: '임실-군자정', name: '임실 군자정', latitude: 35.606661, longitude: 127.281281 },
  { id: '임실-오수득가정', name: '임실 오수득가정', latitude: 35.533342, longitude: 127.329439 },
  { id: '장수-벽계정', name: '장수 벽계정', latitude: 35.652644, longitude: 127.522711 },
  { id: '전주-천양정', name: '전주 천양정', latitude: 35.815225, longitude: 127.137661 },
  { id: '정읍-필야정', name: '정읍 필야정', latitude: 35.559364, longitude: 126.834803 },
  { id: '정읍-함벽정', name: '정읍 함벽정', latitude: 35.650397, longitude: 126.936203 },
  { id: '진안-마이정', name: '진안 마이정', latitude: 35.787639, longitude: 127.428817 },
  { id: '강진-관덕정', name: '강진 관덕정', latitude: 34.720622, longitude: 126.81705 },
  { id: '강진-양무정', name: '강진 양무정', latitude: 34.646383, longitude: 126.76735 },
  { id: '고흥-경호정', name: '고흥 경호정', latitude: 34.524786, longitude: 127.137242 },
  { id: '고흥-문무정', name: '고흥 문무정', latitude: 34.644125, longitude: 127.274089 },
  { id: '고흥-봉황정', name: '고흥 봉황정', latitude: 34.606489, longitude: 127.287364 },
  { id: '고흥-영주정', name: '고흥 영주정', latitude: 34.676722, longitude: 127.362389 },
  { id: '고흥-흥무정', name: '고흥 흥무정', latitude: 34.572333, longitude: 127.237881 },
  { id: '곡성-반구정', name: '곡성 반구정', latitude: 35.29005, longitude: 127.289006 },
  { id: '광양-마로정', name: '광양 마로정', latitude: 34.9539, longitude: 127.702433 },
  { id: '광양-백운정', name: '광양 백운정', latitude: 34.965294, longitude: 127.704869 },
  { id: '광양-유림정', name: '광양 유림정', latitude: 34.985119, longitude: 127.584153 },
  { id: '구례-봉덕정', name: '구례 봉덕정', latitude: 35.206428, longitude: 127.461814 },
  { id: '구례-지산정', name: '구례 지산정', latitude: 35.313989, longitude: 127.4486 },
  { id: '나주-인덕정', name: '나주 인덕정', latitude: 35.031464, longitude: 126.722747 },
  { id: '나주-창랑정', name: '나주 창랑정', latitude: 35.010628, longitude: 126.718742 },
  { id: '담양-무위정', name: '담양 무위정', latitude: 35.312508, longitude: 126.955492 },
  { id: '담양-총무정', name: '담양 총무정', latitude: 35.3234, longitude: 126.990056 },
  { id: '목포-연무정', name: '목포 연무정', latitude: 34.824561, longitude: 126.409436 },
  { id: '무안-숭덕정', name: '무안 숭덕정', latitude: 34.985272, longitude: 126.477775 },
  { id: '무안-청마정', name: '무안 청마정', latitude: 35.0011, longitude: 126.450053 },
  { id: '보성-관덕정', name: '보성 관덕정', latitude: 34.841894, longitude: 127.34815 },
  { id: '보성-청학정', name: '보성 청학정', latitude: 34.774539, longitude: 127.081194 },
  { id: '순천-인향정', name: '순천 인향정', latitude: 35.011461, longitude: 127.476992 },
  { id: '순천-환선정', name: '순천 환선정', latitude: 34.941236, longitude: 127.518039 },
  { id: '신안-용항정', name: '신안 용항정', latitude: 34.706625, longitude: 125.949206 },
  { id: '여수-군자정', name: '여수 군자정', latitude: 34.763308, longitude: 127.7269 },
  { id: '여수-무선정', name: '여수 무선정', latitude: 34.759744, longitude: 127.678719 },
  { id: '여수-충무정', name: '여수 충무정', latitude: 34.738917, longitude: 127.748408 },
  { id: '영광-봉대정', name: '영광 봉대정', latitude: 35.427658, longitude: 126.423161 },
  { id: '영광-육일정', name: '영광 육일정', latitude: 35.291872, longitude: 126.496989 },
  { id: '영암-열무정', name: '영암 열무정', latitude: 34.806547, longitude: 126.701178 },
  { id: '완도-청해정', name: '완도 청해정', latitude: 34.3363, longitude: 126.732003 },
  { id: '장성-백학정', name: '장성 백학정', latitude: 35.320544, longitude: 126.724733 },
  { id: '장흥-흥덕정', name: '장흥 흥덕정', latitude: 34.673311, longitude: 126.897325 },
  { id: '진도-창덕정', name: '진도 창덕정', latitude: 34.475828, longitude: 126.278922 },
  { id: '함평-관덕정', name: '함평 관덕정', latitude: 35.063403, longitude: 126.542964 },
  { id: '해남-만수정', name: '해남 만수정', latitude: 34.568714, longitude: 126.617556 },
  { id: '화순-군자정', name: '화순 군자정', latitude: 35.064175, longitude: 127.123581 },
  { id: '화순-모후정', name: '화순 모후정', latitude: 35.002617, longitude: 127.110853 },
  { id: '화순-서양정', name: '화순 서양정', latitude: 35.058242, longitude: 126.985447 },
  { id: '화순-영덕정', name: '화순 영덕정', latitude: 34.990542, longitude: 126.966267 },
  { id: '경산-삼성현정', name: '경산 삼성현정', latitude: 35.80365, longitude: 128.795289 },
  { id: '경산-장산정', name: '경산 장산정', latitude: 35.888869, longitude: 128.78995 },
  { id: '경주-탈해정', name: '경주 탈해정', latitude: 35.708036, longitude: 129.467342 },
  { id: '경주-호림정', name: '경주 호림정', latitude: 35.858172, longitude: 129.215597 },
  { id: '고령-송암정', name: '고령 송암정', latitude: 35.709828, longitude: 128.261844 },
  { id: '구미-금오정', name: '구미 금오정', latitude: 36.102836, longitude: 128.401189 },
  { id: '김천-김산정', name: '김천 김산정', latitude: 36.142553, longitude: 128.084775 },
  { id: '문경-문경새재정', name: '문경 문경새재정', latitude: 36.642831, longitude: 128.128747 },
  { id: '봉화-청량정', name: '봉화 청량정', latitude: 36.913514, longitude: 128.835475 },
  { id: '상주-상무정', name: '상주 상무정', latitude: 36.407175, longitude: 128.154417 },
  { id: '상주-용운정', name: '상주 용운정', latitude: 36.292925, longitude: 128.095608 },
  { id: '상주-충의정', name: '상주 충의정', latitude: 36.411411, longitude: 128.263753 },
  { id: '성주-가야정', name: '성주 가야정', latitude: 35.913939, longitude: 128.255525 },
  { id: '안동-영락정', name: '안동 영락정', latitude: 36.586494, longitude: 128.749194 },
  { id: '영덕-화림정', name: '영덕 화림정', latitude: 36.425481, longitude: 129.358142 },
  { id: '영양-별빛정', name: '영양 별빛정', latitude: 36.727933, longitude: 129.088789 },
  { id: '영주-충무정', name: '영주 충무정', latitude: 36.817342, longitude: 128.648544 },
  { id: '영천-금무정', name: '영천 금무정', latitude: 35.929244, longitude: 128.876528 },
  { id: '영천-영무정', name: '영천 영무정', latitude: 35.971475, longitude: 128.924092 },
  { id: '예천-무학정', name: '예천 무학정', latitude: 36.635283, longitude: 128.470608 },
  { id: '울릉-무릉정', name: '울릉 무릉정', latitude: 37.498036, longitude: 130.890936 },
  { id: '울릉-성무정', name: '울릉 성무정', latitude: 37.468189, longitude: 130.840892 },
  { id: '울진-칠보정', name: '울진 칠보정', latitude: 37.096319, longitude: 129.356844 },
  { id: '의성-의무정', name: '의성 의무정', latitude: 36.347964, longitude: 128.703894 },
  { id: '청도-대무정', name: '청도 대무정', latitude: 35.653608, longitude: 128.680225 },
  { id: '청송-청호정', name: '청송 청호정', latitude: 36.394536, longitude: 129.009039 },
  { id: '칠곡-호국정', name: '칠곡 호국정', latitude: 35.954514, longitude: 128.411644 },
  { id: '포항-권무정', name: '포항 권무정', latitude: 36.118125, longitude: 129.337311 },
  { id: '포항-송학정', name: '포항 송학정', latitude: 36.006928, longitude: 129.363108 },
  { id: '포항-송호정', name: '포항 송호정', latitude: 36.054967, longitude: 129.367914 },
  { id: '포항-일출정', name: '포항 일출정', latitude: 35.988556, longitude: 129.546575 },
  { id: '계룡-신도정', name: '계룡 신도정', latitude: 36.299144, longitude: 127.234761 },
  { id: '공주-관풍정', name: '공주 관풍정', latitude: 36.465136, longitude: 127.110006 },
  { id: '금산-연무일송정', name: '금산 연무일송정', latitude: 36.17264, longitude: 127.35223 },
  { id: '금산-흥관정', name: '금산 흥관정', latitude: 36.097211, longitude: 127.492419 },
  { id: '논산-덕유정', name: '논산 덕유정', latitude: 36.164322, longitude: 127.018769 },
  { id: '논산-연무정', name: '논산 연무정', latitude: 36.126892, longitude: 127.093922 },
  { id: '당진-망객정', name: '당진 망객정', latitude: 36.883839, longitude: 126.780494 },
  { id: '당진-학유정', name: '당진 학유정', latitude: 36.894514, longitude: 126.635194 },
  { id: '당진국수정', name: '당진국수정', latitude: 36.907325, longitude: 126.6859 },
  { id: '보령-보령정', name: '보령 보령정', latitude: 36.312992, longitude: 126.605169 },
  { id: '부여-육일정', name: '부여 육일정', latitude: 36.311911, longitude: 126.951497 },
  { id: '서산-서령정', name: '서산 서령정', latitude: 36.804953, longitude: 126.438139 },
  { id: '서산-지성정', name: '서산 지성정', latitude: 36.701333, longitude: 126.563289 },
  { id: '서천-서천정', name: '서천 서천정', latitude: 36.059764, longitude: 126.665994 },
  { id: '아산-배방정', name: '아산 배방정', latitude: 36.758358, longitude: 127.094556 },
  { id: '아산-아산정', name: '아산 아산정', latitude: 36.890011, longitude: 126.978358 },
  { id: '아산-충무정', name: '아산 충무정', latitude: 36.781175, longitude: 126.995158 },
  { id: '예산-예덕정', name: '예산 예덕정', latitude: 36.675311, longitude: 126.859242 },
  { id: '천안-거봉정', name: '천안 거봉정', latitude: 36.870761, longitude: 127.206814 },
  { id: '천안-천궁정', name: '천안 천궁정', latitude: 36.831842, longitude: 127.106781 },
  { id: '천안-천안정', name: '천안 천안정', latitude: 36.774417, longitude: 127.231297 },
  { id: '청양-청무정', name: '청양 청무정', latitude: 36.464308, longitude: 126.791447 },
  { id: '태안-소성정', name: '태안 소성정', latitude: 36.752706, longitude: 126.313883 },
  { id: '홍성-광무정', name: '홍성 광무정', latitude: 36.507233, longitude: 126.636667 },
  { id: '홍성-홍무정', name: '홍성 홍무정', latitude: 36.608322, longitude: 126.642303 },
  { id: '거제-계룡정', name: '거제 계룡정', latitude: 34.885186, longitude: 128.614747 },
  { id: '거제-금무정', name: '거제 금무정', latitude: 34.99975, longitude: 128.676247 },
  { id: '거제-벽파정', name: '거제 벽파정', latitude: 34.871753, longitude: 128.733236 },
  { id: '거제-연무정', name: '거제 연무정', latitude: 34.852778, longitude: 128.591794 },
  { id: '거창-아림정', name: '거창 아림정', latitude: 35.693039, longitude: 127.931847 },
  { id: '고성-철성정', name: '고성 철성정', latitude: 34.981706, longitude: 128.311467 },
  { id: '김해-금병정', name: '김해 금병정', latitude: 35.300058, longitude: 128.729242 },
  { id: '김해-봉화정', name: '김해 봉화정', latitude: 35.316678, longitude: 128.801697 },
  { id: '김해-생림정', name: '김해 생림정', latitude: 35.326797, longitude: 128.851117 },
  { id: '남해-금해정', name: '남해 금해정', latitude: 34.841958, longitude: 127.901564 },
  { id: '마산-용마정', name: '마산 용마정', latitude: 35.221925, longitude: 128.578497 },
  { id: '밀양-관락정', name: '밀양 관락정', latitude: 35.370864, longitude: 128.716297 },
  { id: '밀양-영남정', name: '밀양 영남정', latitude: 35.490472, longitude: 128.7842 },
  { id: '사천-관덕정', name: '사천 관덕정', latitude: 35.088975, longitude: 128.101206 },
  { id: '사천-낙홍정', name: '사천 낙홍정', latitude: 35.056964, longitude: 127.958853 },
  { id: '사천-대덕정', name: '사천 대덕정', latitude: 34.956056, longitude: 128.088711 },
  { id: '사천-수양정', name: '사천 수양정', latitude: 35.084342, longitude: 128.102822 },
  { id: '산청-몽학정', name: '산청 몽학정', latitude: 35.294281, longitude: 127.957811 },
  { id: '산청-산청정', name: '산청 산청정', latitude: 35.313781, longitude: 127.974386 },
  { id: '산청-청호정', name: '산청 청호정', latitude: 35.426556, longitude: 127.853989 },
  { id: '양산-춘추정', name: '양산 춘추정', latitude: 35.350619, longitude: 129.024864 },
  { id: '양산-회야정', name: '양산 회야정', latitude: 35.374114, longitude: 129.143208 },
  { id: '의령-정심정', name: '의령 정심정', latitude: 35.467906, longitude: 128.321969 },
  { id: '의령-홍의정', name: '의령 홍의정', latitude: 35.32245, longitude: 128.240147 },
  { id: '진주-남강정', name: '진주 남강정', latitude: 35.1576, longitude: 128.161386 },
  { id: '진주-덕수정', name: '진주 덕수정', latitude: 35.19805, longitude: 127.932956 },
  { id: '진주-람덕정', name: '진주 람덕정', latitude: 35.190872, longitude: 128.094208 },
  { id: '진주-영봉정', name: '진주 영봉정', latitude: 35.16855, longitude: 128.323717 },
  { id: '진주-지수정', name: '진주 지수정', latitude: 35.230786, longitude: 128.270839 },
  { id: '진주-창림정', name: '진주 창림정', latitude: 35.168444, longitude: 128.27935 },
  { id: '창녕-강남정', name: '창녕 강남정', latitude: 35.402506, longitude: 128.481308 },
  { id: '창녕-부곡정', name: '창녕 부곡정', latitude: 35.433669, longitude: 128.593386 },
  { id: '창녕-용산정', name: '창녕 용산정', latitude: 35.458942, longitude: 128.542689 },
  { id: '창녕-창녕정', name: '창녕 창녕정', latitude: 35.522286, longitude: 128.505619 },
  { id: '창원-강무정', name: '창원 강무정', latitude: 35.231522, longitude: 128.661786 },
  { id: '창원-벽해정', name: '창원 벽해정', latitude: 35.170086, longitude: 128.658919 },
  { id: '창원-진해정', name: '창원 진해정', latitude: 35.123203, longitude: 128.71195 },
  { id: '통영-열무정', name: '통영 열무정', latitude: 34.839956, longitude: 128.429517 },
  { id: '통영-장군정', name: '통영 장군정', latitude: 34.799747, longitude: 128.400489 },
  { id: '하동-고현정', name: '하동 고현정', latitude: 35.00985, longitude: 127.815675 },
  { id: '하동-금성정', name: '하동 금성정', latitude: 34.942572, longitude: 127.7948 },
  { id: '하동-금오정', name: '하동 금오정', latitude: 34.948983, longitude: 127.853058 },
  { id: '하동-옥산정', name: '하동 옥산정', latitude: 35.163928, longitude: 127.878322 },
  { id: '하동-용산정', name: '하동 용산정', latitude: 35.157103, longitude: 127.713442 },
  { id: '하동-이명정', name: '하동 이명정', latitude: 35.011903, longitude: 127.916867 },
  { id: '하동-청학정', name: '하동 청학정', latitude: 35.238075, longitude: 127.721689 },
  { id: '하동-하상정', name: '하동 하상정', latitude: 35.057225, longitude: 127.779869 },
  { id: '하동-화개정', name: '하동 화개정', latitude: 35.183803, longitude: 127.627122 },
  { id: '하동-횡강정', name: '하동 횡강정', latitude: 35.109219, longitude: 127.80825 },
  { id: '함안-가야정', name: '함안 가야정', latitude: 35.282811, longitude: 128.396431 },
  { id: '함안-마륜정', name: '함안 마륜정', latitude: 35.312692, longitude: 128.346694 },
  { id: '함안-백이정', name: '함안 백이정', latitude: 35.274331, longitude: 128.351361 },
  { id: '함안-산인정', name: '함안 산인정', latitude: 35.256075, longitude: 128.445358 },
  { id: '함안-성심정', name: '함안 성심정', latitude: 35.309322, longitude: 128.513747 },
  { id: '함안-와룡정', name: '함안 와룡정', latitude: 35.301614, longitude: 128.299767 },
  { id: '함양-관덕정', name: '함양 관덕정', latitude: 35.620719, longitude: 127.811944 },
  { id: '함양-지덕정', name: '함양 지덕정', latitude: 35.397417, longitude: 127.672614 },
  { id: '함양-호연정', name: '함양 호연정', latitude: 35.519283, longitude: 127.718075 },
  { id: '합천-의룡정', name: '합천 의룡정', latitude: 35.543072, longitude: 128.092142 },
  { id: '합천-죽죽정', name: '합천 죽죽정', latitude: 35.560953, longitude: 128.167156 },
  { id: '합천-초팔정', name: '합천 초팔정', latitude: 35.543133, longitude: 128.261833 },
  { id: '서귀포-백록정', name: '서귀포 백록정', latitude: 33.243519, longitude: 126.589033 },
  { id: '서귀포-산방정', name: '서귀포 산방정', latitude: 33.251783, longitude: 126.323747 },
  { id: '서귀포-삼다정', name: '서귀포 삼다정', latitude: 33.299903, longitude: 126.683881 },
  { id: '서귀포-천지정', name: '서귀포 천지정', latitude: 33.258917, longitude: 126.498183 },
  { id: '제주-미리내정', name: '제주 미리내정', latitude: 33.458894, longitude: 126.477908 },
  { id: '제주-한라정', name: '제주 한라정', latitude: 33.517694, longitude: 126.550003 },
  { id: '제승당-한산정', name: '제승당 한산정', latitude: 34.7941, longitude: 128.47156 }
];
const SELECTED_RANGE_STORAGE_KEY = 'arrow_sim_archery_range';
const LAST_PANEL_STORAGE_KEY = 'arrow_sim_last_panel';
const LAST_VIEW_STORAGE_KEY = 'arrow_sim_last_view';
const LAST_RANGE_SEARCH_STORAGE_KEY = 'arrow_sim_last_range_search';
const DIAGRAM_AREA_HEIGHT_STORAGE_KEY = 'arrow_sim_diagram_area_height';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_CACHE_PREFIX = 'arrow_sim_weather_';
let currentWeatherData = null;

function getTargetBearing() {
  const input = Number.parseFloat(document.getElementById('targetBearing')?.value);
  if (!Number.isFinite(input)) return 0;
  return ((input % 360) + 360) % 360;
}

function updateBallisticWindInputs() {
  const hasWeatherWind = currentWeatherData && Number.isFinite(currentWeatherData.windSpeed) && Number.isFinite(currentWeatherData.windDirection);
  setBallisticWindVisibility(Boolean(getSelectedArcheryRange() && hasWeatherWind));
  if (!hasWeatherWind) return;
  const bearing = getTargetBearing();
  const differenceRad = (currentWeatherData.windDirection - bearing) * Math.PI / 180;
  // 기상 풍향은 '바람이 불어오는 방향'이다.
  // 종풍: 과녁에서 사대로 불어오면 음수, 횡풍: 과녁 오른쪽에서 왼쪽이면 음수.
  const longitudinalWind = -currentWeatherData.windSpeed * Math.cos(differenceRad);
  const crosswind = -currentWeatherData.windSpeed * Math.sin(differenceRad);
  const windX = document.getElementById('windX');
  const windY = document.getElementById('windY');
  if (windX) windX.value = longitudinalWind.toFixed(2);
  if (windY) windY.value = crosswind.toFixed(2);
  saveSettings();
  if (typeof drawScene === 'function') drawScene();
  updateSelectedWeatherSummary();
}

function updateSelectedWeatherSummary() {
  const value = id => document.getElementById(id)?.value;
  const display = (id, text) => setWeatherValue(id, text || '-');
  display('weatherWindX', value('windX') ? `${value('windX')}m/s` : '-');
  display('weatherWindY', value('windY') ? `${value('windY')}m/s` : '-');
  display('weatherBallisticAirDensity', value('airDensity') ? `${value('airDensity')}kg/m³` : '-');
  display('weatherTargetDistance', value('targetDistance') ? `${value('targetDistance')}m` : '-');
  display('weatherTargetHeight', value('targetHeight') ? `${value('targetHeight')}m` : '-');
}

function getSelectedArcheryRange() {
  const select = document.getElementById('archeryRangeSelect');
  return ARCHERY_RANGES.find(range => range.id === select?.value) || null;
}

function setBallisticWindVisibility(visible) {
  ['windX', 'windY'].forEach(id => {
    const input = document.getElementById(id);
    const group = input?.closest('.form-group, .weather-input-cell');
    if (group) group.hidden = !visible;
  });
}

function filterArcheryRanges(query = '', showResults = true) {
  const select = document.getElementById('archeryRangeSelect');
  const results = document.getElementById('archeryRangeSearchResults');
  if (!select) return;
  const term = query.trim().toLowerCase();
  const selectedId = select.value;
  const matches = ARCHERY_RANGES.filter(range => !term || range.name.toLowerCase().includes(term));
  const selected = ARCHERY_RANGES.find(range => range.id === selectedId);
  const visible = selected && !matches.some(range => range.id === selected.id) ? [selected, ...matches] : matches;
  select.innerHTML = '';
  visible.forEach(range => select.appendChild(new Option(range.name, range.id)));
  if (visible.some(range => range.id === selectedId)) select.value = selectedId;
  if (results) {
    results.classList.toggle('is-visible', showResults);
    results.innerHTML = '';
    if (!matches.length) {
      results.innerHTML = '<div class="range-search-empty">검색 결과가 없습니다.</div>';
      return;
    }
    // 검색어에 해당하는 전체 활터를 표시해 목록 안에서 스크롤로 확인할 수 있게 한다.
    matches.forEach(range => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `range-search-option${range.id === selectedId ? ' is-selected' : ''}`;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', range.id === selectedId ? 'true' : 'false');
      button.textContent = range.name;
      button.addEventListener('click', () => {
        select.value = range.id;
        const search = document.getElementById('archeryRangeSearch');
        if (search) search.value = range.name;
        results.classList.remove('is-visible');
        results.innerHTML = '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      results.appendChild(button);
    });
  }
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function distanceBetweenCoordinates(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestArcheryRange(latitude, longitude, maxDistanceKm = 1.5) {
  let nearest = null;
  ARCHERY_RANGES.forEach(range => {
    const distanceKm = distanceBetweenCoordinates(latitude, longitude, range.latitude, range.longitude);
    if (!nearest || distanceKm < nearest.distanceKm) nearest = { range, distanceKm };
  });
  return nearest && nearest.distanceKm <= maxDistanceKm ? nearest : null;
}

function renderCurrentLocationWeather(current, latitude, longitude) {
  const nearest = findNearestArcheryRange(latitude, longitude);
  const nameEl = document.getElementById('currentLocationRangeName');
  const status = document.getElementById('currentLocationWeatherStatus');
  if (nameEl) nameEl.textContent = nearest ? `현재 활터: ${nearest.range.name} (${nearest.distanceKm.toFixed(1)}km)` : '현재 위치에 등록된 활터가 없습니다.';
  if (status) status.textContent = nearest ? '현재 위치 GPS와 등록된 활터가 일치합니다.' : '현재 위치 날씨입니다. 검색한 활터와는 별도로 표시됩니다.';
  const values = {
    currentWeatherTemperature: Number.isFinite(Number(current.temperature_2m)) ? `${Number(current.temperature_2m).toFixed(1)}℃` : '-',
    currentWeatherHumidity: Number.isFinite(Number(current.relative_humidity_2m)) ? `${Math.round(Number(current.relative_humidity_2m))}%` : '-',
    currentWeatherPrecipitation: Number.isFinite(Number(current.precipitation)) ? `${Number(current.precipitation).toFixed(1)}mm` : '-',
    currentWeatherWind: Number.isFinite(Number(current.wind_speed_10m)) ? `${Number(current.wind_speed_10m).toFixed(1)}m/s` : '-',
    currentWeatherWindDirection: formatWindDirection(Number(current.wind_direction_10m)),
    currentWeatherAirDensity: (() => { const density = calculateAirDensity(current.temperature_2m, current.relative_humidity_2m, current.surface_pressure); return Number.isFinite(density) ? `${density.toFixed(3)}kg/m³` : '-'; })()
  };
  Object.entries(values).forEach(([id, value]) => setWeatherValue(id, value));
}

async function loadCurrentLocationWeather() {
  const status = document.getElementById('currentLocationWeatherStatus');
  if (!navigator.geolocation) {
    if (status) status.textContent = '이 브라우저에서는 현재 위치를 사용할 수 없습니다.';
    return;
  }
  if (status) status.textContent = '현재 위치를 확인하는 중...';
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      const params = new URLSearchParams({
        latitude: coords.latitude,
        longitude: coords.longitude,
        current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure',
        temperature_unit: 'celsius', wind_speed_unit: 'ms', precipitation_unit: 'mm', timezone: 'auto'
      });
      const data = await fetchWeatherWithRetry(`${WEATHER_API_URL}?${params.toString()}`);
      renderCurrentLocationWeather(data.current || {}, coords.latitude, coords.longitude);
    } catch (error) {
      console.warn('현재 위치 날씨 조회 실패', error);
      if (status) status.textContent = '현재 위치 날씨를 불러오지 못했습니다. 잠시 후 다시 시도하세요.';
    }
  }, error => {
    if (status) status.textContent = error.code === error.PERMISSION_DENIED ? '현재 위치 권한이 거부되었습니다.' : '현재 위치를 확인하지 못했습니다.';
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 });
}

function formatWindDirection(degrees) {
  if (!Number.isFinite(degrees)) return '-';
  const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  return `${directions[Math.round(degrees / 45) % 8]} (${Math.round(degrees)}°)`;
}

function calculateAirDensity(temperatureC, humidity, pressureHpa) {
  const tempK = Number(temperatureC) + 273.15;
  const pressurePa = Number(pressureHpa) * 100;
  const rh = Math.max(0, Math.min(100, Number(humidity))) / 100;
  if (![tempK, pressurePa, rh].every(Number.isFinite) || tempK <= 0) return null;
  const saturationVaporHpa = 6.112 * Math.exp((17.67 * Number(temperatureC)) / (Number(temperatureC) + 243.5));
  const vaporPressurePa = rh * saturationVaporHpa * 100;
  const dryAirPressurePa = pressurePa - vaporPressurePa;
  return (dryAirPressurePa / (287.05 * tempK)) + (vaporPressurePa / (461.495 * tempK));
}

function getWeatherCacheKey(range) {
  return `${WEATHER_CACHE_PREFIX}${range.id}`;
}

function readCachedWeather(range) {
  try {
    const raw = localStorage.getItem(getWeatherCacheKey(range));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeCachedWeather(range, current) {
  try {
    localStorage.setItem(getWeatherCacheKey(range), JSON.stringify({ current, savedAt: Date.now() }));
  } catch (error) {
    // 저장소가 제한된 브라우저에서도 실시간 조회는 계속 진행한다.
  }
}

async function fetchWeatherWithRetry(url, attempts = 2) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { cache: 'no-store', mode: 'cors', signal: controller.signal });
      if (!response.ok) throw new Error(`weather request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 700));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError || new Error('weather request failed');
}

function populateArcheryRangeSelect() {
  const select = document.getElementById('archeryRangeSelect');
  const notice = document.getElementById('rangeDataNotice');
  if (!select) return;
  select.innerHTML = '';
  if (!ARCHERY_RANGES.length) {
    select.appendChild(new Option('등록된 활터 없음', ''));
    if (notice) notice.textContent = 'GPS 자료를 등록하면 해당 활터의 날씨를 조회할 수 있습니다.';
    return;
  }
  ARCHERY_RANGES.forEach(range => select.appendChild(new Option(range.name, range.id)));
  const savedId = localStorage.getItem(SELECTED_RANGE_STORAGE_KEY);
  select.value = ARCHERY_RANGES.some(range => range.id === savedId) ? savedId : ARCHERY_RANGES[0].id;
  if (notice) notice.textContent = `${ARCHERY_RANGES.length}개 활터가 등록되어 있습니다.`;
}

function setWeatherValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function formatWeatherUpdatedAt(rawTime) {
  const date = new Date(rawTime);
  if (!rawTime || Number.isNaN(date.getTime())) return '-';
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderWeatherCurrent(current, range, fromCache = false) {
  if (!current) return false;
  currentWeatherData = {
    windSpeed: Number(current.wind_speed_10m),
    windDirection: Number(current.wind_direction_10m)
  };
  const density = calculateAirDensity(current.temperature_2m, current.relative_humidity_2m, current.surface_pressure);
  const temperatureText = Number.isFinite(Number(current.temperature_2m)) ? `${Number(current.temperature_2m).toFixed(1)}°C` : '-';
  const humidityText = Number.isFinite(Number(current.relative_humidity_2m)) ? `${Math.round(Number(current.relative_humidity_2m))}%` : '-';
  const precipitationText = Number.isFinite(Number(current.precipitation)) ? `${Number(current.precipitation).toFixed(1)}mm` : '-';
  const windText = Number.isFinite(Number(current.wind_speed_10m)) ? `${Number(current.wind_speed_10m).toFixed(1)}m/s` : '-';
  const directionText = formatWindDirection(Number(current.wind_direction_10m));
  const densityText = Number.isFinite(density) ? `${density.toFixed(3)}kg/m³` : '-';
  setWeatherValue('weatherTemperature', temperatureText);
  setWeatherValue('weatherHumidity', humidityText);
  setWeatherValue('weatherPrecipitation', precipitationText);
  setWeatherValue('weatherWind', windText);
  setWeatherValue('weatherWindDirection', directionText);
  setWeatherValue('weatherAirDensity', densityText);
  const airDensityInput = document.getElementById('airDensity');
  if (airDensityInput && Number.isFinite(density)) {
    airDensityInput.value = density.toFixed(3);
    airDensityInput.dispatchEvent(new Event('input', { bubbles: true }));
    airDensityInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  updateBallisticWindInputs();
  const status = document.getElementById('weatherStatus');
  if (status) {
    status.textContent = `${range.name} · 🌡 ${temperatureText} 습도 ${humidityText} 바람 ${windText} 강수 ${precipitationText} 풍향 ${directionText} 공기밀도${densityText} 갱신 ${formatWeatherUpdatedAt(current.time)}`;
  }
  return true;
}

async function loadArcheryRangeWeather() {
  const range = getSelectedArcheryRange();
  currentWeatherData = null;
  const status = document.getElementById('weatherStatus');
  if (!range) {
    if (status) status.textContent = '활터 GPS 자료를 등록하면 날씨를 조회할 수 있습니다.';
    ['weatherTemperature', 'weatherHumidity', 'weatherPrecipitation', 'weatherWind', 'weatherWindDirection', 'weatherAirDensity'].forEach(id => setWeatherValue(id, '-'));
    setBallisticWindVisibility(false);
    return;
  }
  if (status) status.textContent = `${range.name} 날씨를 불러오는 중...`;
  const cached = readCachedWeather(range);
  if (cached?.current) renderWeatherCurrent(cached.current, range, true);
  try {
    const params = new URLSearchParams({
      latitude: range.latitude,
      longitude: range.longitude,
      current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure',
      temperature_unit: 'celsius',
      wind_speed_unit: 'ms',
      precipitation_unit: 'mm',
      timezone: 'auto'
    });
    const data = await fetchWeatherWithRetry(`${WEATHER_API_URL}?${params.toString()}`);
    const current = data.current || {};
    writeCachedWeather(range, current);
    renderWeatherCurrent(current, range);
  } catch (error) {
    console.warn('날씨 조회 실패', error);
    if (cached?.current) {
      if (status) status.textContent = `${range.name} · 실시간 연결 실패, 저장된 최근 날씨를 표시합니다.`;
    } else if (status) {
      status.textContent = '실시간 날씨 연결에 실패했습니다. 잠시 후 새로고침을 눌러 다시 시도하세요.';
    }
  }
}

function setupArcheryRangeWeather() {
  const select = document.getElementById('archeryRangeSelect');
  const refreshButton = document.getElementById('refreshWeatherBtn');
  const searchInput = document.getElementById('archeryRangeSearch');
  const currentLocationButton = document.getElementById('currentLocationWeatherBtn');
  const loadProfileButton = document.getElementById('loadRangeProfileBtn');
  if (!select) return;
  populateArcheryRangeSelect();
  filterArcheryRanges('', false);
  const selectedRange = getSelectedArcheryRange();
  const savedSearch = localStorage.getItem(LAST_RANGE_SEARCH_STORAGE_KEY);
  if (searchInput) searchInput.value = savedSearch || selectedRange?.name || '';
  searchInput?.addEventListener('focus', () => filterArcheryRanges(searchInput.value, true));
  searchInput?.addEventListener('input', () => {
    localStorage.setItem(LAST_RANGE_SEARCH_STORAGE_KEY, searchInput.value);
    filterArcheryRanges(searchInput.value, true);
  });
  searchInput?.addEventListener('blur', () => setTimeout(() => {
    document.getElementById('archeryRangeSearchResults')?.classList.remove('is-visible');
  }, 180));
  select.addEventListener('change', () => {
    saveCurrentRangeProfile();
    localStorage.setItem(SELECTED_RANGE_STORAGE_KEY, select.value);
    const selected = select.options[select.selectedIndex];
    if (selected) localStorage.setItem(LAST_RANGE_SEARCH_STORAGE_KEY, selected.textContent);
    if (searchInput && selected) searchInput.value = selected.textContent;
    applySelectedRangeProfile(getSelectedArcheryRange());
    loadArcheryRangeWeather();
    if (typeof drawScene === 'function') drawScene();
  });
  const bearingInput = document.getElementById('targetBearing');
  bearingInput?.addEventListener('input', () => {
    const range = getSelectedArcheryRange();
    if (range) localStorage.setItem(`arrow_sim_targetBearing_${range.id}`, bearingInput.value);
    saveCurrentRangeProfile();
    updateBallisticWindInputs();
  });
  ['windX', 'windY', 'airDensity', 'targetBearing', 'targetDistance', 'targetHeight'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateSelectedWeatherSummary);
    document.getElementById(id)?.addEventListener('change', updateSelectedWeatherSummary);
  });
  refreshButton?.addEventListener('click', loadArcheryRangeWeather);
  currentLocationButton?.addEventListener('click', loadCurrentLocationWeather);
  loadProfileButton?.addEventListener('click', () => {
    const range = getSelectedArcheryRange();
    if (!range) return;
    applySelectedRangeProfile(range);
    loadArcheryRangeWeather();
    if (typeof drawScene === 'function') drawScene();
    const originalText = loadProfileButton.textContent;
    loadProfileButton.textContent = `${range.name} 저장값 적용됨`;
    window.setTimeout(() => { loadProfileButton.textContent = originalText; }, 1400);
  });
  setBallisticWindVisibility(false);
  applySelectedRangeProfile(getSelectedArcheryRange(), true);
  updateSelectedWeatherSummary();
  loadArcheryRangeWeather();
}

function saveSettings() {
  try {
    INPUT_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) localStorage.setItem('arrow_sim_' + id, el.value);
    });
    const useLosEl = document.getElementById('useLos');
    if (useLosEl) localStorage.setItem('arrow_sim_useLos', useLosEl.checked ? 'true' : 'false');
    ['useVibrate', 'lockLos', 'followArrow'].forEach(id => {
      const el = document.getElementById(id);
      if (el) localStorage.setItem('arrow_sim_' + id, el.checked ? 'true' : 'false');
    });
    const spectatorLightColor = document.getElementById('spectatorLightColor');
    if (spectatorLightColor) localStorage.setItem('arrow_sim_spectatorLightColor', spectatorLightColor.value);
    const spectatorLightDuration = document.getElementById('spectatorLightDuration');
    if (spectatorLightDuration) localStorage.setItem('arrow_sim_spectatorLightDuration', spectatorLightDuration.value);
  } catch (e) {
    // 시크릿 모드 등 브라우저 저장소가 차단된 경우 에러를 무시하고 진행
    console.warn("Storage access denied. Running in volatile memory.", e);
  }
}

function loadSettings() {
  try {
    INPUT_IDS.forEach(id => {
      const savedValue = localStorage.getItem('arrow_sim_' + id);
      const el = document.getElementById(id);
      if (el && savedValue !== null) {
        el.value = savedValue;
      }
    });
    const useLosEl = document.getElementById('useLos');
    const savedLos = localStorage.getItem('arrow_sim_useLos');
    if (useLosEl && savedLos !== null) useLosEl.checked = (savedLos === 'true');
    ['useVibrate', 'lockLos', 'followArrow'].forEach(id => {
      const el = document.getElementById(id);
      const savedValue = localStorage.getItem('arrow_sim_' + id);
      if (el && savedValue !== null) el.checked = (savedValue === 'true');
    });
    const spectatorLightColor = document.getElementById('spectatorLightColor');
    const savedLightColor = localStorage.getItem('arrow_sim_spectatorLightColor');
    if (spectatorLightColor && ['red', 'yellow', 'green'].includes(savedLightColor)) spectatorLightColor.value = savedLightColor;
    const spectatorLightDuration = document.getElementById('spectatorLightDuration');
    const savedLightDuration = Number(localStorage.getItem('arrow_sim_spectatorLightDuration'));
    if (spectatorLightDuration && Number.isFinite(savedLightDuration)) {
      spectatorLightDuration.value = String(Math.max(0.1, Math.min(10, savedLightDuration)));
    }
  } catch (e) {
    // 저장된 값을 읽지 못해도 기본값으로 캔버스가 켜지도록 예외 처리
    console.warn("Storage load failed. Using app defaults.", e);
  }
}

function saveScreenSettingsSnapshot() {
  try {
    const zoom = {};
    const pan = {};
    BACKGROUND_VIEWS.forEach(view => {
      if (typeof getViewZoom === 'function') zoom[view] = getViewZoom(view, 'x');
      if (typeof getViewPan === 'function') pan[view] = getViewPan(view);
    });
    localStorage.setItem('arrow_sim_screen_settings', JSON.stringify({
      diagramAreaHeight: document.getElementById('diagramAreaHeight')?.value || '',
      currentView,
      selectedBackgroundView,
      backgroundCanvasEditMode,
      settingsTab: document.querySelector('[data-settings-tab].active')?.dataset.settingsTab || '',
      panel: document.querySelector('.fixed-panel.active')?.id.replace('panel-', '') || '',
      zoom,
      pan
    }));
  } catch (e) { /* 저장 불가 환경 */ }
}

function restoreScreenSettingsSnapshot() {
  try {
    const raw = localStorage.getItem('arrow_sim_screen_settings');
    const saved = raw ? JSON.parse(raw) : null;
    if (!saved || typeof saved !== 'object') return;
    if (saved.diagramAreaHeight && typeof setDiagramAreaHeight === 'function') {
      setDiagramAreaHeight(saved.diagramAreaHeight, false);
    }
    if (saved.currentView && ['front', 'side', 'top', 'target'].includes(saved.currentView) && saved.currentView !== currentView) {
      const button = Array.from(document.querySelectorAll('.segmented-control .segment-btn'))
        .find(element => element.getAttribute('onclick')?.includes(`'${saved.currentView}'`));
      changeView(saved.currentView, button);
    }
    selectedBackgroundView = 'target';
    const selector = document.getElementById('backgroundViewSelect');
    if (selector) selector.value = 'target';
    if (typeof saved.backgroundCanvasEditMode === 'boolean') {
      backgroundCanvasEditMode = saved.backgroundCanvasEditMode;
    }
    if (saved.settingsTab) {
      const tab = document.querySelector(`[data-settings-tab="${saved.settingsTab}"]`);
      if (tab && !tab.classList.contains('active')) tab.click();
    }
    if (saved.panel && ['arrow', 'method', 'env', 'result', 'settings-file'].includes(saved.panel)) {
      const panel = document.getElementById(`panel-${saved.panel}`);
      if (panel && !panel.classList.contains('active')) switchPanel(saved.panel);
    }
    if (saved.zoom && typeof setViewZoom === 'function') {
      BACKGROUND_VIEWS.forEach(view => {
        const value = Number(saved.zoom[view]);
        if (Number.isFinite(value)) setViewZoom('x', value, view);
      });
    }
    if (saved.pan && typeof setViewPanUnbounded === 'function') {
      BACKGROUND_VIEWS.forEach(view => {
        const value = saved.pan[view];
        if (value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y))) {
          setViewPanUnbounded(Number(value.x), Number(value.y), view);
        }
      });
    }
    updateBackgroundControls();
  } catch (e) { /* 저장된 화면 상태가 손상된 경우 기본값 사용 */ }
}

function persistLastAppState() {
  saveSettings();
  saveScreenSettingsSnapshot();
  saveCurrentRangeProfile();
  BACKGROUND_VIEWS.forEach(view => saveBackgroundState(view));
  try {
    localStorage.setItem(LAST_VIEW_STORAGE_KEY, currentView);
    localStorage.setItem(SELECTED_RANGE_STORAGE_KEY, document.getElementById('archeryRangeSelect')?.value || '');
    const activePanel = document.querySelector('.fixed-panel.active');
    if (activePanel) localStorage.setItem(LAST_PANEL_STORAGE_KEY, activePanel.id.replace('panel-', ''));
    const activeSettingsTab = document.querySelector('[data-settings-tab].active');
    if (activeSettingsTab) localStorage.setItem('arrow_sim_settings_tab', activeSettingsTab.dataset.settingsTab);
  } catch (e) { /* 모바일 브라우저 저장소가 닫힌 경우 무시 */ }
}

window.addEventListener('pagehide', persistLastAppState);
window.addEventListener('beforeunload', persistLastAppState);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persistLastAppState();
});

function setDiagramAreaHeight(value, persist = true) {
  const height = Math.max(35, Math.min(78, Number(value) || 60));
  document.documentElement.style.setProperty('--main-screen-height', `${height}vh`);
  const input = document.getElementById('diagramAreaHeight');
  const output = document.getElementById('diagramAreaHeightValue');
  if (input) input.value = String(height);
  if (output) output.textContent = `${height}%`;
  if (persist) {
    try { localStorage.setItem(DIAGRAM_AREA_HEIGHT_STORAGE_KEY, String(height)); } catch (e) { /* 저장 불가 환경 */ }
    saveScreenSettingsSnapshot();
  }
  window.requestAnimationFrame(() => {
    if (typeof resizeCanvas === 'function') resizeCanvas();
    else if (typeof drawScene === 'function') drawScene();
  });
}

function setupDiagramAreaControl() {
  const input = document.getElementById('diagramAreaHeight');
  if (!input) return;
  let savedHeight = 60;
  try {
    const stored = Number(localStorage.getItem(DIAGRAM_AREA_HEIGHT_STORAGE_KEY));
    if (Number.isFinite(stored)) savedHeight = stored;
  } catch (e) { /* 기본값 사용 */ }
  setDiagramAreaHeight(savedHeight, false);
  input.addEventListener('input', () => setDiagramAreaHeight(input.value));
}

function setupSettingsTabs() {
  const tabs = document.querySelectorAll('[data-settings-tab]');
  const panels = document.querySelectorAll('[data-settings-panel]');
  if (!tabs.length || !panels.length) return;
  const activate = name => {
    tabs.forEach(tab => {
      const active = tab.dataset.settingsTab === name;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach(panel => {
      const active = panel.dataset.settingsPanel === name;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    try { localStorage.setItem('arrow_sim_settings_tab', name); } catch (e) { /* 저장 불가 환경 */ }
    saveScreenSettingsSnapshot();
  };
  let initial = 'display';
  try {
    const saved = localStorage.getItem('arrow_sim_settings_tab');
    if (saved && Array.from(tabs).some(tab => tab.dataset.settingsTab === saved)) initial = saved;
  } catch (e) { /* 기본 탭 사용 */ }
  tabs.forEach(tab => tab.addEventListener('click', () => activate(tab.dataset.settingsTab)));
  activate(initial);
}

function switchPanel(type) {
  saveSettings();
  try { localStorage.setItem(LAST_PANEL_STORAGE_KEY, type); } catch (e) { /* 저장 불가 환경 */ }

  const panelOrder = ['arrow', 'method', 'env', 'result', 'settings-file'];
  const activePanel = document.querySelector('.fixed-panel.active');
  const currentType = activePanel ? activePanel.id.replace('panel-', '') : type;
  const direction = panelOrder.indexOf(type) >= panelOrder.indexOf(currentType) ? 'left' : 'right';
  
  // 💡 기존 배열에 'settings-file'을 추가했습니다.
  const panels = ['arrow', 'method', 'env', 'result', 'settings-file'];
  
  panels.forEach(p => {
    const el = document.getElementById('panel-' + p);
    if (el) el.classList.remove('active');
  });

  const targetPanel = document.getElementById('panel-' + type);
  if (targetPanel) {
    targetPanel.classList.add('active');
    animateSlide(targetPanel, `panel-slide-in-${direction}`);
  }
  
  updateTabActiveStyle(type);
  if (typeof drawScene === 'function') drawScene();
}


function updateTabActiveStyle(type) {
  const tabItems = document.querySelectorAll('.tab-bar .tab-item');
  tabItems.forEach(item => item.classList.remove('active'));
  
  // 💡 HTML 버튼 순서와 똑같이 맨 뒤에 'settings-file'을 추가했습니다.
  const typeOrder = ['arrow', 'method', 'env', 'result', 'settings-file'];
  const activeIndex = typeOrder.indexOf(type);
  
  if (activeIndex !== -1 && tabItems[activeIndex]) {
    tabItems[activeIndex].classList.add('active');
  }
}

let currentView = 'side';
const BACKGROUND_VIEWS = ['front', 'side', 'top', 'target'];
const BACKGROUND_VIEW_NAMES = { front: '정면도', side: '측면도', top: '평면도', target: '과녁도' };
const backgroundImages = { front: null, side: null, top: null, target: null };
const backgroundStates = {};
BACKGROUND_VIEWS.forEach(view => {
  backgroundStates[view] = { dataUrl: '', visible: true, opacity: 0.55, scale: 1, offsetX: 0, offsetY: 0, rotation: 0, locked: false, lockReference: null };
});
let selectedBackgroundView = 'front';
let backgroundCanvasEditMode = false;
const RANGE_PROFILE_STORAGE_PREFIX = 'arrow_sim_range_profile_';

function getRangeProfileStorageKey(rangeId) {
  return `${RANGE_PROFILE_STORAGE_PREFIX}${encodeURIComponent(rangeId || '')}`;
}

function copyBackgroundState(state) {
  return {
    dataUrl: typeof state?.dataUrl === 'string' ? state.dataUrl : '',
    visible: state?.visible !== false,
    opacity: Number.isFinite(Number(state?.opacity)) ? Number(state.opacity) : 0.55,
    scale: Number.isFinite(Number(state?.scale)) ? Number(state.scale) : 1,
    offsetX: Number.isFinite(Number(state?.offsetX)) ? Number(state.offsetX) : 0,
    offsetY: Number.isFinite(Number(state?.offsetY)) ? Number(state.offsetY) : 0,
    rotation: Number.isFinite(Number(state?.rotation)) ? Number(state.rotation) : 0,
    locked: state?.locked === true,
    lockReference: state?.lockReference || null
  };
}

function updateRangeProfileControls() {
  const range = getSelectedArcheryRange();
  const name = document.getElementById('settingsRangeProfileName');
  const bearing = document.getElementById('profileTargetBearing');
  const distance = document.getElementById('profileTargetDistance');
  const height = document.getElementById('profileTargetHeight');
  if (name) name.textContent = range ? range.name : '환경 설정에서 활터를 선택하세요.';
  if (bearing) bearing.value = document.getElementById('targetBearing')?.value || '0';
  if (distance) distance.value = document.getElementById('targetDistance')?.value || '145';
  if (height) height.value = document.getElementById('targetHeight')?.value || '6';
}

function saveCurrentRangeProfile() {
  const range = getSelectedArcheryRange();
  if (!range) return;
  const profile = {
    targetBearing: document.getElementById('targetBearing')?.value || '0',
    targetDistance: document.getElementById('targetDistance')?.value || '145',
    targetHeight: document.getElementById('targetHeight')?.value || '6',
    backgrounds: {}
  };
  BACKGROUND_VIEWS.forEach(view => { profile.backgrounds[view] = copyBackgroundState(backgroundStates[view]); });
  try { localStorage.setItem(getRangeProfileStorageKey(range.id), JSON.stringify(profile)); } catch (e) {
    const notice = document.getElementById('backgroundFileNotice');
    if (notice) notice.textContent = '활터 프로필을 저장하지 못했습니다. 이미지 용량을 줄인 뒤 다시 시도하세요.';
  }
  updateRangeProfileControls();
}

function loadRangeProfileImage(view, dataUrl) {
  backgroundImages[view] = null;
  if (!dataUrl) return;
  const image = new Image();
  image.onload = () => {
    backgroundImages[view] = image;
    if (typeof drawScene === 'function') drawScene();
  };
  image.src = dataUrl;
}

function applySelectedRangeProfile(range, seedExisting = false) {
  if (!range) return;
  let profile = null;
  try {
    const raw = localStorage.getItem(getRangeProfileStorageKey(range.id));
    profile = raw ? JSON.parse(raw) : null;
  } catch (e) { profile = null; }
  const value = (id, fallback) => profile?.[id] === undefined || profile?.[id] === null || profile?.[id] === '' ? fallback : String(profile[id]);
  const bearing = document.getElementById('targetBearing');
  const distance = document.getElementById('targetDistance');
  const height = document.getElementById('targetHeight');
  const legacyBearing = localStorage.getItem(`arrow_sim_targetBearing_${range.id}`);
  if (bearing) bearing.value = value('targetBearing', legacyBearing ?? '0');
  if (distance) distance.value = value('targetDistance', '145');
  if (height) height.value = value('targetHeight', '6');
  BACKGROUND_VIEWS.forEach(view => {
    const saved = profile?.backgrounds?.[view];
    if (saved && typeof saved === 'object') Object.assign(backgroundStates[view], copyBackgroundState(saved));
    else if (!profile && !seedExisting) Object.assign(backgroundStates[view], { dataUrl: '', visible: true, opacity: 0.55, scale: 1, offsetX: 0, offsetY: 0, rotation: 0, locked: false, lockReference: null });
    loadRangeProfileImage(view, backgroundStates[view].dataUrl);
  });
  updateRangeProfileControls();
  updateBackgroundControls();
  if (!profile && seedExisting) saveCurrentRangeProfile();
  if (typeof drawScene === 'function') drawScene();
}

function getViewBackground(view = currentView) {
  if (view !== 'target') return null;
  const state = backgroundStates[view];
  if (!state || !backgroundImages[view]) return null;
  return { ...state, image: backgroundImages[view] };
}

function saveBackgroundState(view) {
  const state = backgroundStates[view];
  if (!state) return;
  try { localStorage.setItem(`arrow_sim_background_${view}`, JSON.stringify(state)); } catch (e) {
    const notice = document.getElementById('backgroundFileNotice');
    if (notice) notice.textContent = '이미지가 너무 커서 저장하지 못했습니다. 현재 화면에서는 계속 사용할 수 있습니다.';
  }
  saveCurrentRangeProfile();
}

function loadBackgroundState(view) {
  const state = backgroundStates[view];
  if (!state) return;
  try {
    const raw = localStorage.getItem(`arrow_sim_background_${view}`);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === 'object') {
      state.dataUrl = typeof saved.dataUrl === 'string' ? saved.dataUrl : '';
      state.visible = saved.visible !== false;
      state.opacity = Number.isFinite(Number(saved.opacity)) ? Math.max(0.05, Math.min(1, Number(saved.opacity))) : 0.55;
      state.scale = Number.isFinite(Number(saved.scale)) ? Math.max(0.05, Math.min(12, Number(saved.scale))) : 1;
      // 배경 위치는 의도적으로 clamp하지 않는다. 무제한 이동을 지원한다.
      state.offsetX = Number.isFinite(Number(saved.offsetX)) ? Number(saved.offsetX) : 0;
      state.offsetY = Number.isFinite(Number(saved.offsetY)) ? Number(saved.offsetY) : 0;
      state.rotation = Number.isFinite(Number(saved.rotation)) ? Number(saved.rotation) : 0;
      state.locked = saved.locked === true;
      state.lockReference = saved.lockReference && typeof saved.lockReference === 'object'
        ? {
            sceneScale: Number(saved.lockReference.sceneScale),
            renderedScale: Number(saved.lockReference.renderedScale),
            anchorMode: saved.lockReference.anchorMode || 'legacy-canvas-center'
          }
        : null;
    }
  } catch (e) { /* 손상되었거나 저장할 수 없는 경우 기본값 사용 */ }
  if (state.dataUrl) {
    const image = new Image();
    image.onload = () => {
      backgroundImages[view] = image;
      if (backgroundStates[view].locked && (!backgroundStates[view].lockReference || !Number.isFinite(backgroundStates[view].lockReference.renderedScale))) {
        backgroundStates[view].lockReference = typeof captureBackgroundLockReference === 'function' ? captureBackgroundLockReference(view) : null;
        saveBackgroundState(view);
      }
      if (typeof drawScene === 'function') drawScene();
    };
    image.src = state.dataUrl;
  }
}

function refreshLockedBackgroundReferences() {
  BACKGROUND_VIEWS.forEach(view => {
    const state = backgroundStates[view];
    if (!state?.locked) return;
    // 이전 버전의 과녁도 잠금은 배경 중심을 캔버스 중앙으로 저장했으므로,
    // 새 결과 과녁 중심으로 한 번만 위치를 이관해 기존 정렬을 보존한다.
    if (view === 'target' && state.lockReference?.anchorMode === 'legacy-canvas-center' && typeof getBackgroundRenderAnchor === 'function') {
      const anchor = getBackgroundRenderAnchor(view);
      // 이전 렌더링은 canvasHeight / 2를 기준으로 했으므로 새 기준점의 차이만 보정한다.
      state.offsetY -= anchor.y - (Number(anchor.legacyY) || anchor.y);
      state.lockReference.anchorMode = 'target-center';
      saveBackgroundState(view);
    }
    if (state.lockReference?.renderedScale > 0) return;
    const reference = typeof captureBackgroundLockReference === 'function' ? captureBackgroundLockReference(view) : null;
    if (reference) {
      state.lockReference = reference;
      saveBackgroundState(view);
    }
  });
}

function updateBackgroundControls() {
  const state = backgroundStates[selectedBackgroundView];
  if (!state) return;
  const viewSelect = document.getElementById('backgroundViewSelect');
  const fileButton = document.getElementById('backgroundFileButton');
  const toggle = document.getElementById('backgroundToggle');
  const fileNotice = document.getElementById('backgroundFileNotice');
  const opacity = document.getElementById('backgroundOpacity');
  const scale = document.getElementById('backgroundScale');
  const rotation = document.getElementById('backgroundRotation');
  const offsetX = document.getElementById('backgroundOffsetX');
  const offsetY = document.getElementById('backgroundOffsetY');
  const opacityNumber = document.getElementById('backgroundOpacityNumber');
  const scaleNumber = document.getElementById('backgroundScaleNumber');
  const rotationNumber = document.getElementById('backgroundRotationNumber');
  const canvasEditToggle = document.getElementById('backgroundCanvasEditToggle');
  const lockToggle = document.getElementById('backgroundResultLockToggle');
  if (viewSelect) viewSelect.value = selectedBackgroundView;
  if (toggle) {
    toggle.textContent = state.visible ? '배경 숨김' : '배경 표시';
    toggle.setAttribute('aria-pressed', state.visible ? 'true' : 'false');
  }
  if (opacity) opacity.value = String(state.opacity);
  if (scale) scale.value = String(state.scale);
  if (rotation) rotation.value = String(state.rotation);
  if (offsetX) offsetX.value = String(state.offsetX);
  if (offsetY) offsetY.value = String(state.offsetY);
  if (opacityNumber) opacityNumber.value = String(Math.round(state.opacity * 100));
  if (scaleNumber) scaleNumber.value = String(Math.round(state.scale * 100));
  if (rotationNumber) rotationNumber.value = String(state.rotation);
  if (canvasEditToggle) {
    canvasEditToggle.setAttribute('aria-pressed', backgroundCanvasEditMode ? 'true' : 'false');
    canvasEditToggle.textContent = backgroundCanvasEditMode ? '화면 배경 조작 중 · 다시 누르면 해제' : '화면에서 배경사진 조작';
  }
  if (lockToggle) {
    lockToggle.setAttribute('aria-pressed', state.locked ? 'true' : 'false');
    lockToggle.textContent = state.locked ? '사진·결과 잠금 해제' : '사진·결과 잠금';
  }
  [fileButton, opacity, scale, rotation, offsetX, offsetY, opacityNumber, scaleNumber, rotationNumber]
    .filter(Boolean)
    .forEach(element => { element.disabled = state.locked; });
  if (canvasEditToggle) canvasEditToggle.disabled = state.locked;
  document.querySelectorAll('[data-background-nudge]').forEach(button => { button.disabled = state.locked; });
  const selectedRange = getSelectedArcheryRange();
  const rangePrefix = selectedRange ? `[${selectedRange.name}] ` : '';
  if (fileNotice) fileNotice.textContent = backgroundImages[selectedBackgroundView]
    ? `${rangePrefix}${BACKGROUND_VIEW_NAMES[selectedBackgroundView]} 배경 적용됨 · 정렬 후 사진·결과 잠금을 켜세요.`
    : `${rangePrefix}${BACKGROUND_VIEW_NAMES[selectedBackgroundView]}에 배경을 불러오세요. 활터별로 독립 저장됩니다.`;
}

function updateSelectedBackgroundState(changes) {
  Object.assign(backgroundStates[selectedBackgroundView], changes);
  saveBackgroundState(selectedBackgroundView);
  saveScreenSettingsSnapshot();
  updateBackgroundControls();
  if (typeof drawScene === 'function') drawScene();
}

function setupBackgroundControls() {
  const fileInput = document.getElementById('backgroundFileInput');
  const fileButton = document.getElementById('backgroundFileButton');
  const canvasEditToggle = document.getElementById('backgroundCanvasEditToggle');
  const lockToggle = document.getElementById('backgroundResultLockToggle');
  const viewSelect = document.getElementById('backgroundViewSelect');
  const toggle = document.getElementById('backgroundToggle');
  const opacity = document.getElementById('backgroundOpacity');
  const scale = document.getElementById('backgroundScale');
  const rotation = document.getElementById('backgroundRotation');
  const offsetX = document.getElementById('backgroundOffsetX');
  const offsetY = document.getElementById('backgroundOffsetY');
  const opacityNumber = document.getElementById('backgroundOpacityNumber');
  const scaleNumber = document.getElementById('backgroundScaleNumber');
  const rotationNumber = document.getElementById('backgroundRotationNumber');
  if (!fileInput || !viewSelect) return;
  BACKGROUND_VIEWS.forEach(loadBackgroundState);
  selectedBackgroundView = 'target';
  try {
    backgroundCanvasEditMode = localStorage.getItem('arrow_sim_background_canvas_edit') === '1';
  } catch (e) { /* 기본값 사용 */ }

  viewSelect.addEventListener('change', () => {
    selectedBackgroundView = BACKGROUND_VIEWS.includes(viewSelect.value) ? viewSelect.value : 'front';
    try { localStorage.setItem('arrow_sim_selected_background_view', selectedBackgroundView); } catch (e) { /* 무시 */ }
    saveScreenSettingsSnapshot();
    const viewButton = Array.from(document.querySelectorAll('.segmented-control .segment-btn'))
      .find(button => button.getAttribute('onclick')?.includes(`'${selectedBackgroundView}'`));
    if (typeof changeView === 'function' && currentView !== selectedBackgroundView) {
      changeView(selectedBackgroundView, viewButton);
      return;
    }
    updateBackgroundControls();
  });
  canvasEditToggle?.addEventListener('click', () => {
    backgroundCanvasEditMode = !backgroundCanvasEditMode;
    try { localStorage.setItem('arrow_sim_background_canvas_edit', backgroundCanvasEditMode ? '1' : '0'); } catch (e) { /* 무시 */ }
    updateBackgroundControls();
  });
  lockToggle?.addEventListener('click', () => {
    const state = backgroundStates[selectedBackgroundView];
    if (!state.locked) {
      const reference = typeof captureBackgroundLockReference === 'function'
        ? captureBackgroundLockReference(selectedBackgroundView)
        : null;
      if (!reference) {
        const notice = document.getElementById('backgroundFileNotice');
        if (notice) notice.textContent = '먼저 선택 도면에 배경사진을 불러온 뒤 잠글 수 있습니다.';
        return;
      }
      state.lockReference = reference;
      state.locked = true;
      backgroundCanvasEditMode = false;
      try { localStorage.setItem('arrow_sim_background_canvas_edit', '0'); } catch (e) { /* 무시 */ }
    } else {
      state.locked = false;
      state.lockReference = null;
    }
    saveBackgroundState(selectedBackgroundView);
    updateBackgroundControls();
    if (typeof drawScene === 'function') drawScene();
  });
  // hidden file input을 label에 의존하지 않고 직접 열어 모바일 브라우저 호환성을 높인다.
  fileButton?.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = event => {
      const image = new Image();
      image.onload = () => {
        backgroundImages[selectedBackgroundView] = image;
        backgroundStates[selectedBackgroundView].dataUrl = String(event.target.result || '');
        backgroundStates[selectedBackgroundView].visible = true;
        saveBackgroundState(selectedBackgroundView);
        updateBackgroundControls();
        if (typeof drawScene === 'function') drawScene();
        // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 선택값을 초기화한다.
        fileInput.value = '';
      };
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
  toggle?.addEventListener('click', () => updateSelectedBackgroundState({ visible: !backgroundStates[selectedBackgroundView].visible }));
  const bindBackgroundInput = (element, readValue) => {
    if (!element) return;
    const apply = () => updateSelectedBackgroundState(readValue(element));
    element.addEventListener('input', apply);
    element.addEventListener('change', apply);
  };
  bindBackgroundInput(opacity, element => ({ opacity: Math.max(0.05, Math.min(1, Number(element.value) || 0.55)) }));
  bindBackgroundInput(scale, element => ({ scale: Math.max(0.05, Math.min(12, Number(element.value) || 1)) }));
  bindBackgroundInput(rotation, element => ({ rotation: Number(element.value) || 0 }));
  bindBackgroundInput(opacityNumber, element => ({ opacity: Math.max(0.05, Math.min(1, (Number(element.value) || 55) / 100)) }));
  bindBackgroundInput(scaleNumber, element => ({ scale: Math.max(0.05, Math.min(12, (Number(element.value) || 100) / 100)) }));
  bindBackgroundInput(rotationNumber, element => ({ rotation: Math.max(-180, Math.min(180, Number(element.value) || 0)) }));
  bindBackgroundInput(offsetX, element => ({ offsetX: Number.isFinite(Number(element.value)) ? Number(element.value) : 0 }));
  bindBackgroundInput(offsetY, element => ({ offsetY: Number.isFinite(Number(element.value)) ? Number(element.value) : 0 }));
  document.querySelectorAll('[data-background-nudge]').forEach(button => {
    button.addEventListener('click', () => {
      const direction = button.dataset.backgroundNudge;
      const state = backgroundStates[selectedBackgroundView];
      if (direction === 'center') {
        updateSelectedBackgroundState({ offsetX: 0, offsetY: 0 });
        return;
      }
      const delta = 0.5;
      const changes = {
        offsetX: state.offsetX + (direction === 'left' ? -delta : direction === 'right' ? delta : 0),
        offsetY: state.offsetY + (direction === 'up' ? -delta : direction === 'down' ? delta : 0)
      };
      updateSelectedBackgroundState(changes);
    });
  });
  updateBackgroundControls();
}

function changeView(viewType, element) {
  const viewOrder = ['front', 'side', 'top', 'target'];
  const previousView = currentView;
  const direction = viewOrder.indexOf(viewType) >= viewOrder.indexOf(previousView) ? 'left' : 'right';
  const buttons = document.querySelectorAll('.segmented-control .segment-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  if (element) element.classList.add('active');
  currentView = viewType;
  selectedBackgroundView = 'target';
  try { localStorage.setItem('arrow_sim_selected_background_view', selectedBackgroundView); } catch (e) { /* 무시 */ }
  updateBackgroundControls();
  try { localStorage.setItem(LAST_VIEW_STORAGE_KEY, viewType); } catch (e) { /* 저장 불가 환경 */ }
  saveScreenSettingsSnapshot();
  updateTargetZoomControls();
  if (typeof drawScene === 'function') drawScene();
  if (viewType !== previousView) {
    animateSlide(document.getElementById('simCanvas'), `view-slide-in-${direction}`);
  }
}

function animateSlide(element, animationClass) {
  if (!element) return;
  element.classList.remove('panel-slide-in-left', 'panel-slide-in-right', 'view-slide-in-left', 'view-slide-in-right');
  void element.offsetWidth;
  element.classList.add(animationClass);
  element.addEventListener('animationend', () => element.classList.remove(animationClass), { once: true });
}

function updateTargetZoomControls() {
  if (typeof updateZoomLabels === 'function') updateZoomLabels();
}

const NEGATIVE_ALLOWED_IDS = ['angle', 'yawAngle', 'windX', 'windY', 'targetHeight', 'losTargetY', 'losTargetZ'];

window.addEventListener('DOMContentLoaded', () => {
  setupDiagramAreaControl();
  setupSettingsTabs();
  loadSettings();
    setupBackgroundControls();
    setupArcheryRangeWeather();
    const savedView = localStorage.getItem(LAST_VIEW_STORAGE_KEY);
    if (['front', 'side', 'top', 'target'].includes(savedView)) {
      const savedViewButton = Array.from(document.querySelectorAll('.segmented-control .segment-btn'))
        .find(button => button.getAttribute('onclick')?.includes(`'${savedView}'`));
      changeView(savedView, savedViewButton);
    }
    const savedPanel = localStorage.getItem(LAST_PANEL_STORAGE_KEY);
    if (['arrow', 'method', 'env', 'result', 'settings-file'].includes(savedPanel)) {
      switchPanel(savedPanel);
    }
    restoreScreenSettingsSnapshot();
    if (typeof updateTargetZoomControls === 'function') updateTargetZoomControls();
    const useLosEl = document.getElementById('useLos');
  if (useLosEl) {
        useLosEl.addEventListener('change', () => {
           if (typeof saveSettings === 'function') saveSettings();
           if (typeof drawScene === 'function') drawScene();
  });
}

  ['useVibrate', 'lockLos', 'followArrow'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      if (typeof saveSettings === 'function') saveSettings();
      if (typeof drawScene === 'function') drawScene();
    });
  });
  const spectatorLightColor = document.getElementById('spectatorLightColor');
  if (spectatorLightColor) spectatorLightColor.addEventListener('change', () => {
    if (typeof saveSettings === 'function') saveSettings();
    if (typeof drawScene === 'function') drawScene();
  });
  const spectatorLightDuration = document.getElementById('spectatorLightDuration');
  if (spectatorLightDuration) spectatorLightDuration.addEventListener('input', () => {
    const value = Number(spectatorLightDuration.value);
    if (Number.isFinite(value)) {
      spectatorLightDuration.value = String(Math.max(0.1, Math.min(10, value)));
    }
    if (typeof saveSettings === 'function') saveSettings();
  });

  const profileInputMap = {
    profileTargetBearing: 'targetBearing',
    profileTargetDistance: 'targetDistance',
    profileTargetHeight: 'targetHeight'
  };
  Object.entries(profileInputMap).forEach(([profileId, targetId]) => {
    const profileInput = document.getElementById(profileId);
    profileInput?.addEventListener('input', () => {
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        targetInput.value = profileInput.value;
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      saveCurrentRangeProfile();
      updateSelectedWeatherSummary();
      if (typeof drawScene === 'function') drawScene();
    });
  });
  document.getElementById('saveRangeProfileBtn')?.addEventListener('click', () => {
    saveCurrentRangeProfile();
    const button = document.getElementById('saveRangeProfileBtn');
    if (button) {
      const original = button.textContent;
      button.textContent = '저장 완료';
      setTimeout(() => { button.textContent = original; }, 1200);
    }
  });
    
  INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (NEGATIVE_ALLOWED_IDS.includes(id)) {
          let val = el.value;
          val = val.replace(/[^0-9.-]/g, '');
          val = val.replace(/(?!^)-/g, '');
          const parts = val.split('.');
          if (parts.length > 2) {
            val = parts[0] + '.' + parts.slice(1).join('');
          }
          el.value = val;
        }
        saveSettings();
        if (['targetBearing', 'targetDistance', 'targetHeight'].includes(id)) saveCurrentRangeProfile();
        if (typeof drawScene === 'function') drawScene();
      });
    }
  });

  // 모바일 터치 환경에서 모든 안내 팝업을 공통 오버레이로 열고 바깥 터치로 닫는다.
  const helpGroups = document.querySelectorAll('.hint-group, .coefficient-group');
  const helpOverlay = document.getElementById('impactEnergyOverlay');
  if (helpGroups.length && helpOverlay) {
    let activeHelpGroup = null;
    let scrollLockState = null;
    const panelContainer = document.getElementById('panel-container');
    const lockPageScroll = () => {
      if (scrollLockState) return;
      scrollLockState = {
        bodyOverflow: document.body.style.overflow,
        bodyPosition: document.body.style.position,
        bodyTop: document.body.style.top,
        bodyWidth: document.body.style.width,
        panelOverflowY: panelContainer?.style.overflowY || '',
        panelOverscrollBehavior: panelContainer?.style.overscrollBehavior || '',
        panelScrollTop: panelContainer?.scrollTop || 0,
        windowScrollY: window.scrollY
      };
      document.body.classList.add('help-popup-open');
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollLockState.windowScrollY}px`;
      document.body.style.width = '100%';
      if (panelContainer) {
        panelContainer.style.overflowY = 'hidden';
        panelContainer.style.overscrollBehavior = 'none';
      }
    };
    const unlockPageScroll = () => {
      if (!scrollLockState) return;
      const state = scrollLockState;
      scrollLockState = null;
      document.body.classList.remove('help-popup-open');
      document.body.style.overflow = state.bodyOverflow;
      document.body.style.position = state.bodyPosition;
      document.body.style.top = state.bodyTop;
      document.body.style.width = state.bodyWidth;
      if (panelContainer) {
        panelContainer.style.overflowY = state.panelOverflowY;
        panelContainer.style.overscrollBehavior = state.panelOverscrollBehavior;
        panelContainer.scrollTop = state.panelScrollTop;
      }
      window.scrollTo(0, state.windowScrollY);
    };
    const showHelpOverlay = (group) => {
      activeHelpGroup = group;
      lockPageScroll();
      helpOverlay.classList.add('is-visible');
      helpOverlay.setAttribute('aria-hidden', 'false');
    };
    const hideHelpOverlay = () => {
      helpOverlay.classList.remove('is-visible');
      helpOverlay.setAttribute('aria-hidden', 'true');
      activeHelpGroup = null;
      unlockPageScroll();
      const focused = document.activeElement;
      if (focused && focused.closest('.hint-group, .coefficient-group')) focused.blur();
    };

    helpGroups.forEach(group => {
      group.addEventListener('focusin', () => showHelpOverlay(group));
      group.addEventListener('focusout', () => {
        window.setTimeout(() => {
          const focusedGroup = document.activeElement?.closest?.('.hint-group, .coefficient-group');
          if (!focusedGroup && activeHelpGroup === group) hideHelpOverlay();
        }, 0);
      });
    });

    helpOverlay.addEventListener('pointerdown', hideHelpOverlay, { passive: true });
    helpOverlay.addEventListener('touchstart', hideHelpOverlay, { passive: true });
    helpOverlay.addEventListener('click', hideHelpOverlay);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideHelpOverlay();
    });
  }

  // =========================================================================
  // [💡 위치 기억 기능 추가] 무제한 스크린 프리 드래그 제어 시스템
  // =========================================================================
  const dragBtn = document.getElementById('draggableFireBtn');
  if (!dragBtn) return;

  let isDragging = false;
  let hasMoved = false;
  let activePointerId = null;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  let suppressNextClick = false;
  let touchFallbackTimer = null;
  let touchActionHandled = false;

  function activateFireButton() {
    if (typeof toggleFlightPause === 'function') toggleFlightPause();
    else if (typeof fireArrow === 'function') fireArrow();
  }

  // 이전 사용 위치 복원 함수
  function loadButtonPosition() {
    const savedLeft = localStorage.getItem('arrow_sim_btn_left');
    const savedTop = localStorage.getItem('arrow_sim_btn_top');
    
    if (savedLeft !== null && savedTop !== null) {
      dragBtn.style.left = savedLeft;
      dragBtn.style.top = savedTop;
      dragBtn.style.right = 'auto'; // 초기 CSS 우측 고정 해제
    }
  }

  function startDrag(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDragging = true;
    hasMoved = false;
    activePointerId = e.pointerId;
    if (e.pointerType === 'touch') {
      touchActionHandled = false;
      if (touchFallbackTimer) clearTimeout(touchFallbackTimer);
    }
    startX = e.clientX;
    startY = e.clientY;
    if (dragBtn.setPointerCapture) dragBtn.setPointerCapture(e.pointerId);
    const rect = dragBtn.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
  }

  function doDrag(e) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMoved = true;
    }
    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // 브라우저 뷰포트 전체 크기를 기준으로 가둠
    const maxLeft = window.innerWidth - dragBtn.offsetWidth;
    const maxTop = window.innerHeight - dragBtn.offsetHeight;
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    dragBtn.style.left = newLeft + 'px';
    dragBtn.style.top = newTop + 'px';
    dragBtn.style.right = 'auto';
  }

  function endDrag(e) {
    if (!isDragging || e.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;
    if (dragBtn.releasePointerCapture) {
      try { dragBtn.releasePointerCapture(e.pointerId); } catch (ignore) {}
    }
    if (!hasMoved) {
      if (e.pointerType === 'touch') {
        // 정상적인 모바일 click이 오면 click 핸들러가 실행하고,
        // click이 누락되는 WebView에서만 보조 타이머가 실행한다.
        touchFallbackTimer = setTimeout(() => {
          if (!touchActionHandled) {
            touchActionHandled = true;
            activateFireButton();
          }
        }, 350);
      }
    } else {
      touchActionHandled = true;
      suppressNextClick = true;
      setTimeout(() => { suppressNextClick = false; }, 400);
      // 드래그 이동이 정상적으로 완료되면 로컬스토리지에 위치 좌표 저장
      localStorage.setItem('arrow_sim_btn_left', dragBtn.style.left);
      localStorage.setItem('arrow_sim_btn_top', dragBtn.style.top);
    }
  }

  // 초기 실행 시 저장된 버튼 위치 불러오기
  loadButtonPosition();

  // 이벤트 리스너 등록
  dragBtn.addEventListener('pointerdown', startDrag, { passive: false });
  dragBtn.addEventListener('pointermove', doDrag, { passive: false });
  dragBtn.addEventListener('pointerup', endDrag, { passive: false });
  dragBtn.addEventListener('pointercancel', endDrag, { passive: false });
  // Pointer Events를 지원하지 않는 환경과 키보드 입력을 위한 클릭 보완 경로
  dragBtn.addEventListener('click', () => {
    if (touchFallbackTimer) {
      clearTimeout(touchFallbackTimer);
      touchFallbackTimer = null;
      if (touchActionHandled) return;
      touchActionHandled = true;
      activateFireButton();
      return;
    }
    if (suppressNextClick) return;
    activateFireButton();
  });
 
  const useLosCheck = document.getElementById('useLos');
  if (useLosCheck) {
    // loadSettings()에서 기본값 또는 저장된 상태를 복원한 뒤 변경값을 저장한다.
    useLosCheck.addEventListener('change', () => {
      if (typeof saveSettings === 'function') saveSettings();
      if (typeof drawScene === 'function') drawScene();
    });
  }  
  
});
// 인트로 공지사항 모달 닫기 함수
function closeIntro() {
  const introModal = document.getElementById('introModal');
  if (introModal) {
    introModal.style.opacity = '0';
    introModal.style.visibility = 'hidden';
    setTimeout(() => {
      introModal.style.display = 'none';
    }, 300); // CSS transition 시간(0.3s)과 일치시켜 부드럽게 제거
  }
}

// =========================================================
// 🎯 과녁도 표보기 조준점 실시간 터치/마우스 드래그 시스템 (최종 검증 완결본)
// =========================================================
let isTargetDragging = false;
let isCanvasPanning = false;
const simCanvasEl = document.getElementById('simCanvas');

if (simCanvasEl) {
    simCanvasEl.addEventListener('mousedown', startTargetDrag);
    simCanvasEl.addEventListener('touchstart', startTargetDrag, { passive: false });
}

window.addEventListener('mousemove', doTargetDrag);
window.addEventListener('touchmove', doTargetDrag, { passive: false });
window.addEventListener('mouseup', endTargetDrag);
window.addEventListener('touchend', endTargetDrag);

function startTargetDrag(e) {
    if (typeof currentView !== 'undefined' && currentView !== 'target') return;
    if (isCanvasPanning) return;
    if (e.touches && e.touches.length > 1) return;
    if (e.touches) e.preventDefault(); 
    isTargetDragging = true;
    updateTargetCoords(e);
}

function doTargetDrag(e) {
    if (!isTargetDragging) return;
    if (typeof currentView !== 'undefined' && currentView !== 'target') return;
    if (e.touches) e.preventDefault();
    updateTargetCoords(e);
}

function endTargetDrag(e) {
    isTargetDragging = false;
}

function updateTargetCoords(e) {
    const canvasEl = document.getElementById('simCanvas');
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const currentDprWidth = canvasEl.width / (window.devicePixelRatio || 1);
    const currentDprHeight = canvasEl.height / (window.devicePixelRatio || 1);

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const tBottomY = currentDprHeight * 0.75;
    const targetViewScaleX = typeof getTargetViewScale === 'function'
      ? getTargetViewScale('x')
      : Math.min(currentDprWidth, currentDprHeight) / 5.5;
    const targetViewScaleY = typeof getTargetViewScale === 'function'
      ? getTargetViewScale('y')
      : Math.min(currentDprWidth, currentDprHeight) / 5.5;

    const calculatedZ = (canvasX - (currentDprWidth / 2)) / targetViewScaleX;
    const calculatedY = (tBottomY - canvasY) / targetViewScaleY;

    const losYEl = document.getElementById('losTargetY');
    const losZEl = document.getElementById('losTargetZ');
    const useLosEl = document.getElementById('useLos');
    const lockLosEl = document.getElementById('lockLos'); // 💡 고정 엘리먼트 가져오기 추가
    
    // 💡 [우선순위 제어] 표보기 설정(useLos)이 체크되어 있지 않다면 터치 입력을 무시하고 리턴합니다.
    if (!useLosEl || !useLosEl.checked) {
        return;
    }

    // 💡 [새로 추가된 고정 기능] 고정 체크박스가 켜져 있다면 터치 입력을 무시하고 리턴합니다.
    if (lockLosEl && lockLosEl.checked) {
        return;
    }
    
    if (losYEl && losZEl) {
        losYEl.value = calculatedY.toFixed(2);
        losZEl.value = calculatedZ.toFixed(2);
    
        localStorage.setItem('arrow_sim_losTargetY', losYEl.value);
        localStorage.setItem('arrow_sim_losTargetZ', losZEl.value);
    
        if (typeof drawScene === 'function') {
            window.requestAnimationFrame(drawScene);
        }
    }
}

// =========================================================
// 모든 화면의 가로·세로 독립 확대/축소 입력(버튼, 휠, 두 손가락 핀치)
// =========================================================
(() => {
  const canvasEl = document.getElementById('simCanvas');
  const zoomXOut = document.getElementById('zoomXOut');
  const zoomXIn = document.getElementById('zoomXIn');
  const zoomRange = document.getElementById('zoomRange');
  const zoomNumber = document.getElementById('zoomNumber');
  const zoomReset = document.getElementById('zoomReset');
  if (!canvasEl) return;

  const adjustZoom = (delta) => {
    if (typeof getViewZoom !== 'function' || typeof setViewZoom !== 'function') return;
    setViewZoom('x', getViewZoom(currentView, 'x') + delta);
  };

  if (zoomXOut) zoomXOut.addEventListener('click', () => adjustZoom(-0.25));
  if (zoomXIn) zoomXIn.addEventListener('click', () => adjustZoom(0.25));
  zoomRange?.addEventListener('input', () => {
    if (typeof setViewZoom === 'function') setViewZoom('x', Number(zoomRange.value));
  });
  zoomRange?.addEventListener('change', () => {
    if (typeof setViewZoom === 'function') setViewZoom('x', Number(zoomRange.value));
  });
  zoomNumber?.addEventListener('input', () => {
    const value = Number(zoomNumber.value);
    if (Number.isFinite(value) && typeof setViewZoom === 'function') setViewZoom('x', value / 100);
  });
  zoomNumber?.addEventListener('change', () => {
    const value = Number(zoomNumber.value);
    if (Number.isFinite(value) && typeof setViewZoom === 'function') setViewZoom('x', value / 100);
  });
  if (zoomReset) zoomReset.addEventListener('click', () => {
    if (typeof resetViewZoom === 'function') resetViewZoom(currentView);
  });

  canvasEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    adjustZoom(e.deltaY < 0 ? 0.25 : -0.25);
  }, { passive: false });

  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  canvasEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    isTargetDragging = false;
    pinchStartDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    pinchStartZoom = typeof getViewZoom === 'function' ? getViewZoom(currentView, 'x') : 1;
  }, { passive: false });

  canvasEl.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || !pinchStartDistance) return;
    e.preventDefault();
    const distance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    if (typeof setViewZoom === 'function') {
      const ratio = distance / pinchStartDistance;
      setViewZoom('x', pinchStartZoom * ratio);
    }
  }, { passive: false });

  canvasEl.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinchStartDistance = 0;
  });
})();

// 확대된 화면을 한 손가락/마우스로 끌어 이동하는 패닝 기능
(() => {
  const canvasEl = document.getElementById('simCanvas');
  if (!canvasEl) return;
  let panPointerId = null;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  const activeTouchPointers = new Set();
  let backgroundPointerId = null;
  let backgroundStartX = 0;
  let backgroundStartY = 0;
  let backgroundOriginX = 0;
  let backgroundOriginY = 0;
  let backgroundOnlyPointer = false;

  function canDragCurrentBackground(event) {
    const background = typeof getViewBackground === 'function' ? getViewBackground(currentView) : null;
    return event.pointerType === 'touch' && Boolean(background && background.visible !== false);
  }

  function updateBackgroundFromPointer(event) {
    if (event.pointerId !== backgroundPointerId) return;
    // 화면 이동량은 0.5px 격자에 맞춰 누적하며 이동 범위는 제한하지 않는다.
    const nextX = Math.round((backgroundOriginX + event.clientX - backgroundStartX) / 0.5) * 0.5;
    const nextY = Math.round((backgroundOriginY + event.clientY - backgroundStartY) / 0.5) * 0.5;
    if (backgroundOnlyPointer) {
      const state = backgroundStates[currentView];
      if (!state) return;
      state.offsetX = nextX;
      state.offsetY = nextY;
      if (typeof saveBackgroundState === 'function') saveBackgroundState(currentView);
      if (typeof updateBackgroundControls === 'function') updateBackgroundControls();
      if (typeof drawScene === 'function') drawScene();
    } else if (typeof setViewPanUnbounded === 'function') {
      // 배경 정렬 후 일반 드래그는 배경·그리드·과녁·궤적·화살을 한 몸으로 이동한다.
      setViewPanUnbounded(nextX, nextY, currentView);
    }
  }

  function canPan() {
    if (currentView !== 'target') return true;
    // 과녁도는 확대 상태에서 화면 이동을 우선하고,
    // 기본 배율에서는 기존 조준점 드래그를 유지한다.
    return typeof getViewZoom !== 'function' || getViewZoom('target', 'x') > 1;
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if ((!canPan() && !canDragCurrentBackground(e)) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.pointerType === 'touch') {
      activeTouchPointers.add(e.pointerId);
      if (activeTouchPointers.size > 1) {
        backgroundPointerId = null;
        backgroundOnlyPointer = false;
        panPointerId = null;
        return;
      }
    }
    if (canDragCurrentBackground(e)) {
      // 배경이 있는 화면에서는 한 손가락 제스처를 화면 패닝이 아닌
      // 현재 도면 배경 이동으로 사용한다. 두 손가락은 기존 핀치 줌으로 남긴다.
      isTargetDragging = false;
      backgroundPointerId = e.pointerId;
      backgroundStartX = e.clientX;
      backgroundStartY = e.clientY;
      backgroundOnlyPointer = backgroundCanvasEditMode;
      const state = backgroundStates[currentView];
      const origin = backgroundOnlyPointer
        ? { x: Number(state?.offsetX) || 0, y: Number(state?.offsetY) || 0 }
        : (typeof getViewPan === 'function' ? getViewPan(currentView) : { x: 0, y: 0 });
      backgroundOriginX = Number(origin?.x) || 0;
      backgroundOriginY = Number(origin?.y) || 0;
      isCanvasPanning = true;
      if (canvasEl.setPointerCapture) canvasEl.setPointerCapture(e.pointerId);
      if (e.cancelable) e.preventDefault();
      return;
    }
    panPointerId = e.pointerId;
    isCanvasPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    const origin = getViewPan(currentView);
    panOriginX = origin.x;
    panOriginY = origin.y;
    if (canvasEl.setPointerCapture) canvasEl.setPointerCapture(e.pointerId);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  canvasEl.addEventListener('pointermove', (e) => {
    if (e.pointerId === backgroundPointerId) {
      updateBackgroundFromPointer(e);
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (e.pointerId !== panPointerId) return;
    if (typeof getViewPan !== 'function' || typeof setViewPan !== 'function') return;
    setViewPan(panOriginX + e.clientX - panStartX, panOriginY + e.clientY - panStartY, currentView);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  function endPan(e) {
    if (e.pointerType === 'touch') activeTouchPointers.delete(e.pointerId);
    if (e.pointerType === 'touch' && activeTouchPointers.size === 0) isCanvasPanning = false;
    if (e.pointerId === backgroundPointerId) {
      backgroundPointerId = null;
      backgroundOnlyPointer = false;
      isCanvasPanning = false;
      if (canvasEl.releasePointerCapture) {
        try { canvasEl.releasePointerCapture(e.pointerId); } catch (ignore) {}
      }
      return;
    }
    if (e.pointerId !== panPointerId) return;
    panPointerId = null;
    isCanvasPanning = false;
    if (canvasEl.releasePointerCapture) {
      try { canvasEl.releasePointerCapture(e.pointerId); } catch (ignore) {}
    }
  }
  canvasEl.addEventListener('pointerup', endPan);
  canvasEl.addEventListener('pointercancel', endPan);
})();


// 인트로 공지사항 모달 닫기 함수 (안전 재배치)
function closeIntro() {
    const introModal = document.getElementById('introModal');
    if (introModal) {
        introModal.style.opacity = '0';
        introModal.style.visibility = 'hidden';
        setTimeout(() => {
            introModal.style.display = 'none';
        }, 300);
    }
}
// =========================================================
// 🎯 하단 설정 카드 좌우 스와이프(밀기) 전환 시스템 추가
// =========================================================
const panelContainer = document.getElementById('panel-container');

if (panelContainer) {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // 탭 순서 정의
    const tabsOrder = ['arrow', 'method', 'env', 'result'];

    panelContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    panelContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // 수평 스와이프 조건 (대각선 오작동 방지: 수평 이동이 수직 이동보다 커야 함)
        if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
            // 현재 활성화된 패널 찾기
            const activePanel = document.querySelector('.fixed-panel.active');
            if (!activePanel) return;
            
            const currentType = activePanel.id.replace('panel-', '');
            const currentIndex = tabsOrder.indexOf(currentType);

            if (deltaX < 0) {
                // ◀ 왼쪽으로 밀기 (다음 패널로 이동)
                if (currentIndex < tabsOrder.length - 1) {
                    switchPanel(tabsOrder[currentIndex + 1]);
                }
            } else {
                // ▶ 오른쪽으로 밀기 (이전 패널로 이동)
                if (currentIndex > 0) {
                    switchPanel(tabsOrder[currentIndex - 1]);
                }
            }
        }
    }
}
// 상단 시뮬레이터 뷰(정면·측면·평면·과녁)는 상단 탭 클릭으로만 전환한다.
// =========================================================
// 화면 배율 프리셋 저장·불러오기
// =========================================================
const ZOOM_PRESETS_STORAGE_KEY = 'arrow_sim_zoom_presets';

function getZoomPresets() {
  try {
    const raw = localStorage.getItem(ZOOM_PRESETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveZoomPresets(presets) {
  try { localStorage.setItem(ZOOM_PRESETS_STORAGE_KEY, JSON.stringify(presets)); } catch (e) { /* 저장 불가 환경 */ }
}

function refreshZoomPresetSelect() {
  const select = document.getElementById('zoomPresetSelect');
  if (!select) return;
  const presets = getZoomPresets();
  select.innerHTML = '';
  if (!presets.length) {
    select.appendChild(new Option('저장된 프리셋 없음', ''));
    return;
  }
  presets.forEach((preset, index) => {
    select.appendChild(new Option(preset.name, String(index)));
  });
}

function collectZoomPreset() {
  const presetZooms = {};
  if (typeof viewZooms !== 'undefined') {
    Object.keys(viewZooms).forEach(view => {
      presetZooms[view] = {
        x: Number(viewZooms[view].x) || 1,
        y: Number(viewZooms[view].y) || 1
      };
    });
  }
  return presetZooms;
}

function applyZoomPreset(presetZooms) {
  if (!presetZooms || typeof setViewZoom !== 'function') return false;
  Object.keys(presetZooms).forEach(view => {
    const values = presetZooms[view];
    if (!values || !Number.isFinite(Number(values.x)) || !Number.isFinite(Number(values.y))) return;
    setViewZoom('x', Number(values.x), view);
    setViewZoom('y', Number(values.y), view);
  });
  if (typeof updateZoomLabels === 'function') updateZoomLabels();
  if (typeof drawScene === 'function') drawScene();
  return true;
}

function setupZoomPresetControls() {
  const nameInput = document.getElementById('zoomPresetName');
  const select = document.getElementById('zoomPresetSelect');
  const saveBtn = document.getElementById('saveZoomPresetBtn');
  const loadBtn = document.getElementById('loadZoomPresetBtn');
  const deleteBtn = document.getElementById('deleteZoomPresetBtn');
  if (!nameInput || !select || !saveBtn || !loadBtn || !deleteBtn) return;

  refreshZoomPresetSelect();

  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('저장할 프리셋 이름을 입력하세요.');
      nameInput.focus();
      return;
    }
    const presets = getZoomPresets();
    const existingIndex = presets.findIndex(preset => preset.name === name);
    const preset = { name, zooms: collectZoomPreset(), savedAt: Date.now() };
    if (existingIndex >= 0) presets[existingIndex] = preset;
    else presets.push(preset);
    saveZoomPresets(presets);
    refreshZoomPresetSelect();
    select.value = String(existingIndex >= 0 ? existingIndex : presets.length - 1);
    alert(`'${name}' 프리셋을 저장했습니다.`);
  });

  loadBtn.addEventListener('click', () => {
    const index = Number(select.value);
    const presets = getZoomPresets();
    if (!Number.isInteger(index) || !presets[index]) return;
    applyZoomPreset(presets[index].zooms);
    alert(`'${presets[index].name}' 프리셋을 불러왔습니다.`);
  });

  deleteBtn.addEventListener('click', () => {
    const index = Number(select.value);
    const presets = getZoomPresets();
    if (!Number.isInteger(index) || !presets[index]) return;
    const deletedName = presets[index].name;
    presets.splice(index, 1);
    saveZoomPresets(presets);
    refreshZoomPresetSelect();
    alert(`'${deletedName}' 프리셋을 삭제했습니다.`);
  });
}

// =========================================================
// [1단계] 설정 파일 저장 (유저 지정 이름으로 다운로드)
// =========================================================
function exportSettingsToFile() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    // 1. 현재 화면의 최신 입력값들을 로컬스토리지에 먼저 동기화
    if (typeof saveSettings === 'function') saveSettings();

    // 2. 기본 파일 이름 생성 (예: arrow_sim_settings_2026-07-10)
    const defaultDate = new Date().toISOString().slice(0, 10);
    const defaultFileName = `arrow_sim_settings_${defaultDate}`;

    // 3. 유저에게 팝업창으로 파일 이름 입력받기
    let customFileName = prompt("저장할 설정 파일 이름을 입력하세요:", defaultFileName);
    
    // 취소 버튼을 누른 경우 작동 중단
    if (customFileName === null) return; 

    // 앞뒤 공백 제거 및 빈칸일 경우 기본 이름 적용
    customFileName = customFileName.trim();
    if (customFileName === "") {
      customFileName = defaultFileName;
    }

    // 4. 저장할 데이터 구조 조립
    const configData = {};
    
    // INPUT_IDS 배열을 순회하며 데이터 수집
    if (typeof INPUT_IDS !== 'undefined') {
      INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) configData[id] = el.value;
      });
    }

    // useLos 체크박스 상태 수집
    const useLosEl = document.getElementById('useLos');
    if (useLosEl) configData['useLos'] = useLosEl.checked;

    // 발시 버튼 위치 정보 수집
    const btnLeft = localStorage.getItem('arrow_sim_btn_left');
    const btnTop = localStorage.getItem('arrow_sim_btn_top');
    if (btnLeft) configData['btn_left'] = btnLeft;
    if (btnTop) configData['btn_top'] = btnTop;

    // 화면 배율 프리셋 수집
    configData['zoomPresets'] = getZoomPresets();
    const selectedRange = document.getElementById('archeryRangeSelect')?.value || '';
    configData['archeryRangeId'] = selectedRange;
    const bearingInput = document.getElementById('targetBearing');
    if (bearingInput) configData['targetBearing'] = bearingInput.value;
    configData['rangeBearings'] = {};
    ARCHERY_RANGES.forEach(range => {
      const bearing = localStorage.getItem(`arrow_sim_targetBearing_${range.id}`);
      if (bearing !== null && bearing !== '') configData['rangeBearings'][range.id] = bearing;
    });

    // 5. 가상 다운로드 링크를 생성하여 JSON 파일 내보내기
    const jsonString = JSON.stringify(configData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    // 확장자(.json) 중복 방지 처리
    link.download = customFileName.endsWith('.json') ? customFileName : `${customFileName}.json`;
    
    document.body.appendChild(link);
    link.click();
    
    // 메모리 정리 및 가상 링크 제거
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// =========================================================
// [2단계] 설정 파일 열기 (JSON 읽기 및 화면 반영)
// =========================================================
function importSettingsFromFile() {
  const loadBtn = document.getElementById('loadSettingsBtn');
  const fileInput = document.getElementById('settingsFileInput');
  if (!loadBtn || !fileInput) return;

  // 1. 열기 그래픽 버튼 클릭 시, 숨겨진 실제 파일 선택 창을 트리거
  loadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // 2. 파일 선택 창에서 사용자가 파일을 골랐을 때의 처리
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const configData = JSON.parse(event.target.result);

        // 정상적인 객체 데이터인지 검증
        if (!configData || typeof configData !== 'object') {
          alert('올바르지 않은 설정 파일 형식입니다.');
          return;
        }

        // INPUT_IDS 항목들을 순회하며 화면 입력창 채우고 로컬스토리지 저장
        if (typeof INPUT_IDS !== 'undefined') {
          INPUT_IDS.forEach(id => {
            if (configData[id] !== undefined) {
              const el = document.getElementById(id);
              if (el) el.value = configData[id];
              localStorage.setItem('arrow_sim_' + id, configData[id]);
            }
          });
        }

        // useLos 체크박스 상태 복원
        if (configData['useLos'] !== undefined) {
          const useLosEl = document.getElementById('useLos');
          if (useLosEl) useLosEl.checked = configData['useLos'];
          localStorage.setItem('arrow_sim_useLos', configData['useLos'] ? 'true' : 'false');
        }

        // 발시 버튼 위치 복원 및 로컬스토리지 최신화
        if (configData['btn_left'] && configData['btn_top']) {
          localStorage.setItem('arrow_sim_btn_left', configData['btn_left']);
          localStorage.setItem('arrow_sim_btn_top', configData['btn_top']);
          
          const dragBtn = document.getElementById('draggableFireBtn');
          if (dragBtn) {
            dragBtn.style.left = configData['btn_left'];
            dragBtn.style.top = configData['btn_top'];
            dragBtn.style.right = 'auto'; // 기존 우측 고정 초기화
          }
        }

        // 화면 배율 프리셋 복원
        if (Array.isArray(configData['zoomPresets'])) {
          saveZoomPresets(configData['zoomPresets']);
          refreshZoomPresetSelect();
        }

        if (typeof configData['archeryRangeId'] === 'string') {
          const rangeSelect = document.getElementById('archeryRangeSelect');
          if (rangeSelect && ARCHERY_RANGES.some(range => range.id === configData['archeryRangeId'])) {
            rangeSelect.value = configData['archeryRangeId'];
            localStorage.setItem(SELECTED_RANGE_STORAGE_KEY, configData['archeryRangeId']);
            loadArcheryRangeWeather();
          }
        }
        if (configData['targetBearing'] !== undefined) {
          const bearingInput = document.getElementById('targetBearing');
          const rangeSelect = document.getElementById('archeryRangeSelect');
          if (bearingInput) bearingInput.value = configData['targetBearing'];
          if (rangeSelect?.value) localStorage.setItem(`arrow_sim_targetBearing_${rangeSelect.value}`, configData['targetBearing']);
          updateBallisticWindInputs();
        }
        if (configData['rangeBearings'] && typeof configData['rangeBearings'] === 'object') {
          Object.entries(configData['rangeBearings']).forEach(([rangeId, bearing]) => {
            if (ARCHERY_RANGES.some(range => range.id === rangeId)) {
              localStorage.setItem(`arrow_sim_targetBearing_${rangeId}`, String(bearing));
            }
          });
          const activeRangeId = document.getElementById('archeryRangeSelect')?.value;
          const activeBearing = activeRangeId ? localStorage.getItem(`arrow_sim_targetBearing_${activeRangeId}`) : null;
          const bearingInput = document.getElementById('targetBearing');
          if (bearingInput && activeBearing !== null) bearingInput.value = activeBearing;
        }

        // 3. 변경된 데이터 기반으로 시뮬레이터 화면 즉시 갱신
        if (typeof drawScene === 'function') drawScene();
        
        alert('설정 파일이 성공적으로 적용되었습니다.');

      } catch (error) {
        alert('파일을 읽는 중 오류가 발생했습니다: ' + error.message);
      } finally {
        // 똑같은 파일을 연속으로 다시 불러올 수 있도록 파일 선택 상태 초기화
        fileInput.value = '';
      }
    };

    reader.readAsText(file);
  });
}

// =========================================================
// [3단계] 문서 로드가 완료되면 기능들을 최종 활성화
// =========================================================
window.addEventListener('DOMContentLoaded', () => {
  setupZoomPresetControls();
  exportSettingsToFile();
  importSettingsFromFile();
});
